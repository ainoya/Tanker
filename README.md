## Overview
Web UI for docker private registry.

* Search tags in specified repository
* Show image details 
* Delete image

## How to use
Clone project and execute this command.

    npm start 

## Configuration 
Default host:port for docker private registry is [localhost:5000] .
you can change the host and port.

    NODE_REGISTRY_HOST = localhost
    NODE_REGISTRY_PORT = 5000

Default tcp port that this server use is 3000
you can change the port.

    NODE_PORT = 3000
