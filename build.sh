#!/bin/bash

npm i

tar Rzcf cgserver.tgz bin node_modules public views routes cloud_rendering_lib *.js *.json

docker build . -t cgserver

docker images | grep cgserver

rm -f cgserver.tgz