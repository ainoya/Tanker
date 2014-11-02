# Tanker: a web viewer for docker private registry.

## Overview

Web UI for docker private registry.

* Search tags in specified repository
* Show image details 
* Delete image

#### How to use

Clone project and execute this command.

    go get github.com/mattn/gom # Install gom, a package manager
    gom install
    gom run server.go

Then, you can access the page:

    open http://localhost:3000/docker

#### Configuration 

Default host:port for docker private registry is [localhost:5000] .
you can change the host and port by command line argument.

    -D=localhost:5000

Default tcp port that this server use is 3000
you can change the port by command line argument.

    -P=:3000
