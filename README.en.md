# CAR Backend Demo

- zh [中文](README.md)
- en [English](README.en.md)

## Table of Contents

- [CAR Backend Demo](#car-backend-demo)
  - [Table of Contents](#table-of-contents)
  - [Quick deployment](#quick-deployment)
    - [1. Install the demo](#1-install-the-demo)
    - [2. Generate the configuration file](#2-generate-the-configuration-file)
    - [3. Start the service](#3-start-the-service)
  - [Container deployment](#container-deployment)
    - [1. Install Docker on the host machine](#1-install-docker-on-the-host-machine)
    - [2. Generate an image](#2-generate-an-image)
    - [3. Start a container instance](#3-start-a-container-instance)
  - [API Request Type](#api-request-type)
  - [APIs](#apis)
    - [1. Start an application](#1-start-an-application)
    - [2. End an application](#2-end-an-application)
    - [3. Queue up](#3-queue-up)
    - [4. Leave the queue](#4-leave-the-queue)
  - [Error Codes](#error-codes)

## Quick deployment

### 1. Install the demo

Download the source code. Go to the directory of the source code and run the script below.

- If you use Windows, run `install.ps1` in PowerShell.

- If you use Unix/Linux, run the Bash script `install.sh`.

### 2. Generate the configuration file

During the installation process, enter parameter values as required:

- SECRET_ID: The `SecretId` of your Tencent Cloud account, which you can view in [API Keys](https://console.intl.cloud.tencent.com/cam/capi).

- SECRET_KEY: The `SecretKey` of your Tencent Cloud account, which you can view in [API Keys](https://console.intl.cloud.tencent.com/cam/capi).

- API_SIGN: Whether to enable request parameter validation. This is disabled by default. To ensure data security, we recommend you enable it after you launch your project.

    If you enable request parameter validation, you need to also specify the signature obfuscation key (`SALT`).

- SALT: The API signature key, which you should keep safe. If you enable request parameter validation, you need to pass in an additional request parameter `sign`, which is generated based on `SALT`. For more information on how it’s generated, see below.

### 3. Start the service

After configuration, the service will be started automatically. If the console prints `car-server-demo@0.0.0 start`, the service is started successfully.

The default request address is <http://ip:3000/xxx>.

To start the service later, you can also type the following command in the terminal window:

```bash
npm run start
```

## Container deployment

### 1. Install Docker on the host machine

### 2. Generate an image

If you do not want to set environment variables, run this command:

```bash
node install.js 
```

After `config.json` is generated, run the command below to generate an image:

```bash
chmod 777 build.sh && ./build.sh
```

### 3. Start a container instance

If you do not want to set environment variables, run this command:

```bash
docker run -d -p3000:3000 cgserver
```

If you want to pass environment variables, run this command (you don’t need to set environment variables if the `config.json` file has been generated):

```bash
docker run -d -p3000:3000 -e SECRET_KEY=xxx -e SECRET_ID=yyy -e SALT=zzz cgserver
```

Supported environment variables:

- SECRET_ID: The `SecretId` of your Tencent Cloud account, which you can view in [API Keys](https://console.intl.cloud.tencent.com/cam/capi).

- SECRET_KEY: The `SecretKey` of your Tencent Cloud account, which you can view in [API Keys](https://console.intl.cloud.tencent.com/cam/capi).

- API_SIGN: Whether to enable request parameter validation. This is disabled by default. To ensure data security, we recommend you enable it after you launch your project.

    If you enable request parameter validation, you need to also specify the signature obfuscation key (`SALT`).

- SALT: The API signature key, which you should keep safe. If you enable request parameter validation, you need to pass in an additional request parameter `sign`, which is generated based on `SALT`. For more information on how it’s generated, see below.

## API Request Type

- Request method: HTTP POST
- Data type: JSON
- Default port: 3000. To use a different port, modify the port number in `bin/www` and restart the service.
- Console request example:

```bash
curl -X POST --data "ClientSession=xxx&RequestId=req123&UserId=userid123&ProjectId=cap-xxx&Sign=xxxx" http://127.0.0.1:3000/StartProject
```

## APIs

### 1. Start an application

- Path: ```/StartProject```

- Description: This API is used to start an application. Calling this API will not put a user in queue.

- Request parameters

| Parameter     | Type   | Required                     | Description                                                                                                                                                                                     |
| ------------- | ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UserId        | string | Yes                          | The user ID, which is assigned by you.                                                                                                                                                          |
| ProjectId     | string | Yes                          | The CAR project ID, which is assigned when a project is created. You can view it (format: cap-xxx) in [Project management](https://console.intl.cloud.tencent.com/car/project).                 |
| ClientSession | string | Yes                          | The client session information.                                                                                                                                                                 |
| RequestId     | string | No                           | The request ID, which is assigned by you.                                                                                                                                                       |
| Sign          | string | Yes if validation is enabled | The validation parameter. <br>Calculation: The parameters are sorted by name and their values are spliced into a string, to which `SALT` is appended. The string is then converted into SHA256. |

- Response parameters

| Parameter       | Type   | Description                     |
| --------------- | ------ | ------------------------------- |
| Code            | number | The return code.                |
| Msg             | string | The message.                    |
| RequestId       | string | The request ID.                 |
| SessionDescribe | object | The WebRTC session information. |

- `SessionDescribe` structure

| Parameter     | Type   | Description         |
| ------------- | ------ | ------------------- |
| ServerSession | string | The server session. |
| RequestId     | string | The CAR request ID. |

### 2. End an application

- Path: ```/StopProject```

- Description: This API is used to release the concurrency resources of an application.

- Request parameters

| Parameter | Type   | Required                     | Description                                                                                                                                                                                     |
| --------- | ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UserId    | string | Yes                          | The user ID, which is assigned by you.                                                                                                                                                          |
| RequestId | string | No                           | The request ID, which is assigned by you.                                                                                                                                                       |
| Sign      | string | Yes if validation is enabled | The validation parameter. <br>Calculation: The parameters are sorted by name and their values are spliced into a string, to which `SALT` is appended. The string is then converted into SHA256. |

- Response parameters

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| Code      | number | The return code. |
| Msg       | string | The message.     |
| RequestId | string | The request ID.  |

### 3. Queue up

- Path: ```/Enqueue```

- Description: This API is used to put a user in queue. If the user joins the queue successfully, the queue number will be returned. The return code `10101` indicates that it is the user’s turn, and you need to call `StartProject` again to start the application.

- Request parameters

| Parameter | Type   | Required                     | Description                                                                                                                                                                                     |
| --------- | ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UserId    | string | Yes                          | The user ID, which is assigned by you.                                                                                                                                                          |
| ProjectId | string | Yes                          | The CAR project ID, which is assigned when a project is created. You can view it (format: cap-xxx) in [Project management](https://console.intl.cloud.tencent.com/car/project).                 |
| RequestId | string | No                           | The request ID, which is assigned by you.                                                                                                                                                       |
| Sign      | string | Yes if validation is enabled | The validation parameter. <br>Calculation: The parameters are sorted by name and their values are spliced into a string, to which `SALT` is appended. The string is then converted into SHA256. |

- Response parameters

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| Code      | number | The return code.       |
| Msg       | string | The message.           |
| RequestId | string | The request ID.        |
| Data      | object | The queue information. |

- `Data` structure
  
| Parameter | Type   | Description       |
| --------- | ------ | ----------------- |
| Index     | number | The queue number. |
| userID    | String | The user ID.      |
| ProjectId | string | The project ID.   |

### 4. Leave the queue

- Path: ```/Dequeue```

- Description: This API is used to leave the queue.

- Request parameters

| Parameter | Type   | Required                     | Description                                                                                                                                                                                     |
| --------- | ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UserId    | string | Yes                          | The user ID, which is assigned by you.                                                                                                                                                          |
| RequestId | string | No                           | The request ID, which is assigned by you.                                                                                                                                                       |
| Sign      | string | Yes if validation is enabled | The validation parameter. <br>Calculation: The parameters are sorted by name and their values are spliced into a string, to which `SALT` is appended. The string is then converted into SHA256. |

- Response parameters

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| Code      | number | The return code. |
| Msg       | string | The message.     |
| RequestId | string | The request ID.  |

## Error Codes

| Code  | Description                                                          |
| ----- | -------------------------------------------------------------------- |
| 0     | Request successful.                                                  |
| 10000 | `sign` authentication error.                                         |
| 10001 | Parameter missing.                                                   |
| 10100 | The user is queuing up. Please continue requesting the queue number. |
| 10101 | The user’s turn has come.                                            |
| 10200 | Failed to create the CAR session.                                    |
| 10201 | Failed to release the CAR session.                                   |
| 10202 | Failed to apply the concurrent.                                      |
