#!/bin/sh
# Wait for gateway to be resolvable before starting nginx
echo "Waiting for gateway to be available..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if getent hosts gateway > /dev/null 2>&1; then
        echo "gateway is resolvable, starting nginx..."
        break
    fi
    RETRY=$((RETRY+1))
    echo "gateway not yet available (attempt $RETRY/$MAX_RETRIES), waiting 2s..."
    sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "WARNING: gateway not resolvable after ${MAX_RETRIES} attempts, starting nginx anyway..."
fi

# Run nginx in foreground
exec nginx -g "daemon off;"