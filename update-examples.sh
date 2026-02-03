#!/bin/bash

# Script to update npm packages in all example directories
# Iterates 2 levels deep in ./examples and runs npm update where package.json exists

set -e  # Exit on error

EXAMPLES_DIR="./examples"
UPDATED_COUNT=0
FAILED_COUNT=0

echo "Starting npm update for all examples..."
echo "========================================="
echo ""

# Check if examples directory exists
if [ ! -d "$EXAMPLES_DIR" ]; then
    echo "Error: $EXAMPLES_DIR directory not found"
    exit 1
fi

# Iterate through first level (e.g., document-processing, rag-customer-support)
for category in "$EXAMPLES_DIR"/*; do
    if [ -d "$category" ]; then
        # Check if package.json exists at category level
        if [ -f "$category/package.json" ]; then
            echo "Found package.json in: $category"
            echo "Running npm update..."
            if (cd "$category" && npm update); then
                echo "✓ Successfully updated: $category"
                ((UPDATED_COUNT++))
            else
                echo "✗ Failed to update: $category"
                ((FAILED_COUNT++))
            fi
            echo ""
        fi
        
        # Iterate through second level (e.g., agentic-document-processing, fraud-detection)
        for example in "$category"/*; do
            if [ -d "$example" ] && [ -f "$example/package.json" ]; then
                echo "Found package.json in: $example"
                echo "Running npm update..."
                if (cd "$example" && npm update); then
                    echo "✓ Successfully updated: $example"
                    ((UPDATED_COUNT++))
                else
                    echo "✗ Failed to update: $example"
                    ((FAILED_COUNT++))
                fi
                echo ""
            fi
        done
    fi
done

echo "========================================="
echo "Update complete!"
echo "Successfully updated: $UPDATED_COUNT directories"
echo "Failed: $FAILED_COUNT directories"
