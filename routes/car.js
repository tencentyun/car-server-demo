const express = require('express');
const router = express.Router();

const {
  applyConcurrent,
  destroySession,
  createSession } = require('../cloud_rendering_lib/car');
const {
  AppErrorMsg,
  QueueState,
  getClientIp,
  validString,
  validSchema,
  simpleRespone,
  onMissParams } = require('../cloud_rendering_lib/com');
const { verifySign } = require('../cloud_rendering_lib/sign');
const { createRedisConnection } = require('../cloud_rendering_lib/redis');
const { Config, DefaultKeys } = require('../cloud_rendering_lib/config');
const RequestConstraint = require('../cloud_rendering_lib/constraint');
const BaseQueue = require('../cloud_rendering_lib/base_queue');
const MemQueue = require('../cloud_rendering_lib/mem_queue');
const RedisQueue = require('../cloud_rendering_lib/redis_queue');
const LOG = require('../cloud_rendering_lib/log');

let apiParamsSchema = {};
const waitQueue = {};
const enqueueTimeout = 30000;   // ms
const queueCheckInterval = 1000; // ms
const noIdleMsg = 'ResourceNotFound.NoIdle';

queue = new BaseQueue(queueCheckInterval);
if (Config.configs[DefaultKeys.REDIS_QUEUE] == 'Y') {
  createRedisConnection();
  queue = new RedisQueue("WaitQueue", queueCheckInterval);
} else {
  queue = new MemQueue(queueCheckInterval);
}

if (Config.configs[DefaultKeys.API_SIGN] == 'Y') {
  apiParamsSchema = {
    '/StartProject': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
      ClientSession: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/StopProject': {
      UserId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/Enqueue': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/Dequeue': {
      UserId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    onFailed: onMissParams
  };
} else {
  apiParamsSchema = {
    '/StartProject': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
      ClientSession: validSchema(validString, true),
    },
    '/StopProject': {
      UserId: validSchema(validString, true),
    },
    '/Enqueue': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
    },
    '/Dequeue': {
      UserId: validSchema(validString, true),
    },
    onFailed: onMissParams
  };
}

const verifyReqParams = RequestConstraint.prototype.verify.bind(new RequestConstraint(apiParamsSchema));

router.post('/StartProject', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;

  try {
    const userIp = getClientIp(req);

    // 申请并发，详细接口说明参照（https://cloud.tencent.com/document/product/1547/72827）
    let ret = await applyConcurrent({
      UserId: params.UserId,
      UserIp: userIp,
      ProjectId: params.ProjectId,
    });
    if (ret.Code != 0) {
      simpleRespone(req, res, ret);
      return;
    }

    // 创建会话，详细接口说明参照（https://cloud.tencent.com/document/product/1547/72826）
    ret = await createSession({
      UserId: params.UserId,
      UserIp: userIp,
      ClientSession: params.ClientSession,
    });


    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, e);
  }
});

router.post('/StopProject', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;
  const userId = params.UserId;

  try {
    // 销毁会话，详细接口说明参照（https://cloud.tencent.com/document/product/1547/72812）
    ret = await destroySession({
      UserId: userId
    });

    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, ret);
  }
});

const doCheckQueue = async key => {
  do {
    try {
      const item = waitQueue[key];
      if ((Date.now() - item.TimeStamp) > enqueueTimeout) {
        LOG.debug(`${item.UserId} enqueue timeout`);
        break;
      }

      const params = {
        UserId: item.UserId,
        ProjectId: item.ProjectId,
        UserIp: item.UserIp
      };
      waitQueue[key].State = QueueState.Locking;
      const ret = await applyConcurrent(params);
      LOG.debug(`${item.UserId} ready to play, applyConcurrent ret:`, ret);
    } catch (e) {
      if (e.Error && e.Error.code === noIdleMsg) {
        if (waitQueue[key]) {
          waitQueue[key].State = QueueState.Wait;
          LOG.debug(`${waitQueue[key].UserId} reset to wait`);
        }
        return false;
      }
      LOG.debug(`${waitQueue[key].UserId} reject error: ${e.Error.code}, remove from queue`);
    }
  } while (0);
  delete waitQueue[key];
  return true;
};

router.post('/Enqueue', verifyReqParams, verifySign, async (req, res, next) => {
  const Params = req.body;
  const UserId = Params.UserId;
  const ProjectId = Params.ProjectId;
  const UserIp = getClientIp(req);

  const response = (item, index) => {
    let ret = AppErrorMsg.Queuing;
    if (item.State === QueueState.Done) {
      ret = AppErrorMsg.QueueDone;
      LOG.debug(`${item.UserId} queue done`);
    }
    res.json({
      RequestId: Params.RequestId,
      Data: {
        Index: index,
        UserId: item.UserId,
        ProjectId: item.ProjectId
      }, ...ret
    });
    return LOG.debug(ret.Msg);
  };

  if (waitQueue[UserId]) {
    waitQueue[UserId].TimeStamp = Date.now();
    waitQueue[UserId].ProjectId = ProjectId;
    LOG.debug(`${UserId} update timestamp`);
    return response(waitQueue[UserId], await queue.indexOf(UserId));
  }

  const newUser = {
    UserId,
    ProjectId,
    UserIp,
    TimeStamp: Date.now(),
    State: QueueState.Wait,
  };
  try {
    await applyConcurrent({ UserId: UserId, ProjectId: ProjectId, UserIp: UserIp });
    newUser.State = QueueState.Done;
    newUser.TimeStamp = Date.now();
    LOG.debug(`${UserId} ready to play`);
    return response(newUser, 0);
  } catch (e) {
    LOG.error(req.path, 'imediately trylock raise except:', e);
  }

  newUser.TimeStamp = Date.now();
  queue.enqueue(UserId, doCheckQueue);
  waitQueue[UserId] = newUser;
  LOG.debug(`new user ${UserId} queuing`);

  return response(newUser, await queue.indexOf(UserId));
});

router.post('/Dequeue', verifyReqParams, verifySign, async (req, res, next) => {
  const Params = req.body;
  const UserId = Params.UserId;

  queue.dequeue(UserId);
  delete waitQueue[UserId];
  LOG.debug(`${UserId} dequeue`);
  res.json({ RequestId: Params.RequestId, ...AppErrorMsg.Ok });
});

Config.registerModule(__filename, {
  router
});
