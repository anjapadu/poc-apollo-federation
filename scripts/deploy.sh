#!/bin/bash

set -e # Exit on errors

# Base ECR repository (update with your repository)
ECR_BASE="917720423594.dkr.ecr.us-east-1.amazonaws.com"

# Directory to store hashes
HASH_DIR=".project-hashes"

# Ensure the hash directory exists
mkdir -p "$HASH_DIR"

# Ensure arguments are provided
if [[ $# -eq 0 ]]; then
  echo "Error: No project names provided."
  echo "Usage: ./deploy-projects.sh project1 project2 ..."
  exit 1
fi

# List of project names to deploy
PROJECTS=("$@")

# Find directories with a package.json
find_directories() {
  find . -type f -name "package.json" \
    ! -path "*/node_modules/*" \
    ! -path "*/dist/*" \
    | while read -r package; do
      dirname "$package"
    done
}
# Generate a hash for a project directory
generate_hash() {
  local dir="$1"
  # Hash all files in the directory (excluding node_modules and dist)
  find "$dir" -type f ! -path "$dir/node_modules/*" ! -path "$dir/dist/*" -exec sha256sum {} \; | sha256sum | awk '{print $1}'
}

delete_old_latest_tag() {
  local project_name="$1"
  echo "Deleting all 'latest' tags for project: $project_name"

  # List all images with the 'latest' tag
  local image_ids=$(aws ecr describe-images --repository-name "$project_name-service-repo" \
    --query 'imageDetails[?contains(imageTags, `latest`)].{imageDigest:imageDigest}' \
    --output text)

  if [[ -z "$image_ids" ]]; then
    echo "No 'latest' tags found for $project_name"
    return
  fi

  # Delete each image with the 'latest' tag
  for image_id in $image_ids; do
    echo "Deleting image with digest: $image_id"
    aws ecr batch-delete-image --repository-name "$project_name-service-repo" --image-ids imageDigest="$image_id"
  done

  echo "All 'latest' tags deleted for $project_name"
}
# Deploy a single project
deploy_project() {
  local dir="$1"
  local project_name=$(basename "$dir")

  echo "Checking changes for project: $project_name"

  # Generate the current hash
  local current_hash
  current_hash=$(generate_hash "$dir")

  # Check if hash has changed
  local hash_file="$HASH_DIR/$project_name.hash"
  if [[ -f "$hash_file" ]]; then
    local previous_hash
    previous_hash=$(cat "$hash_file")

    if [[ "$current_hash" == "$previous_hash" ]]; then
      echo "No changes detected for $project_name. Skipping deployment."
      return
    fi
  fi

  echo "Changes detected for $project_name. Deploying..."

  # Check if Dockerfile.production exists
  if [[ ! -f "$dir/Dockerfile.production" ]]; then
    echo "Error: Dockerfile.production not found in $dir. Skipping $project_name."
    return
  fi

  # Delete the old latest tag
  # delete_old_latest_tag "$project_name"

  # Docker build
  docker build --platform linux/amd64 -t "$project_name-service-repo:latest" "$dir" -f "$dir/Dockerfile.production" --no-cache

  # Docker tag
  docker tag "$project_name-service-repo:latest" "$ECR_BASE/$project_name-service-repo:latest"

  # Docker push
  docker push "$ECR_BASE/$project_name-service-repo:latest"

  # Save the current hash
  echo "$current_hash" > "$hash_file"

  echo "Deployment completed for project: $project_name"
}

# Main script
main() {
  echo "Finding directories with package.json..."
  all_directories=$(find_directories)

  if [[ -z "$all_directories" ]]; then
    echo "No directories with package.json found!"
    exit 1
  fi

  echo "Checking specified projects for deployment..."
  for project in "${PROJECTS[@]}"; do
    match=$(echo "$all_directories" | grep "/$project$")
    if [[ -z "$match" ]]; then
      echo "Warning: Project '$project' not found or does not contain a package.json. Skipping."
      continue
    fi

    deploy_project "$match"
  done
}

main
