
BUILD_ID:=$(shell date +%s)

.PHONY: dist

build: dist image push

dist:
	npm run build

image:
	docker build  . --platform linux/amd64 -t docker.rangic:6000/tracks.frontend:${BUILD_ID}

push:
	docker push docker.rangic:6000/tracks.frontend:${BUILD_ID}

run:
	http-server dist/ -p 8888
