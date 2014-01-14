#!/usr/bin/env bash

source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/env.sh"

get ()
{
  # $1 is directory
  # $2 is commit hash

  rm -rf ${BUILD}/$1
  git clone git@github.com:declarativ/$1.git ${BUILD}/$1
  pushd ${BUILD}/$1
    git config user.name "Declarativ Bot"
    git config user.email dev@declarativ.com

    # if commit hash is set then check it out
    if [ "$2" ];
    then
      git checkout "$2"
    fi

    # Tag every deploy
    # git tag -a -m "$BUILD_URL" "deploy-$BUILD_NUMBER"
    # git push --tags

    # Create a file with the git hash so that given just an image we know what
    # code is in it
    git rev-parse HEAD > GIT_HASH

    # Remove git directory before uploading to server to reduce size
    rm -rf .git
  popd
}

get filament $FILAMENT_COMMIT
get firefly $FIREFLY_COMMIT

${BUILD}/packerio/packer build \
	-var "do_api_key=3b6311afca5bd8aac647b316704e9c6d" \
	-var "do_client_id=383c8164d4bdd95d8b1bfbf4f540d754" \
	-var "snapshot_name=fireflyimage" \
	${HOME}/deploy/firefly-image.json

rm -rf ${BUILD}/filament
rm -rf ${BUILD}/firefly
