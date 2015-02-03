#!/usr/bin/env bash

source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/env.sh"

# Parse the arguments list and setup the environment
source "${HOME}/deploy/build/parse-arguments.sh" "$@"

source "${HOME}/deploy/build/get.sh"

get-release-number
check-refs

remove-image "base-image-$BUILD_RELEASE_NAME"

export UBUNTU_VERSION=14.04
export BASE_IMAGE_ID=$(tugboat images --global |grep x64 |grep Ubuntu |grep "^$UBUNTU_VERSION" |awk -F'id: ' '{ print $2 }' |awk -F',' '{ print $1 }')

echo "***** Building base-image-$BUILD_RELEASE_NAME *****"

packer build \
    -only digitalocean \
    -var "do_api_key=3b6311afca5bd8aac647b316704e9c6d" \
    -var "do_client_id=383c8164d4bdd95d8b1bfbf4f540d754" \
    -var "base_image_id=$BASE_IMAGE_ID" \
    -var "snapshot_name=base-image-$BUILD_RELEASE_NAME" \
    "${HOME}/deploy/base-image.json"
