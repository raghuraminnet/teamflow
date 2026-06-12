FROM nginx:alpine

# Copy mime types (override default)
COPY mime.types /etc/nginx/mime.types

# Copy main nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy site configs
COPY conf.d/ /etc/nginx/conf.d/

# Create recordings directory
RUN mkdir -p /usr/share/nginx/html/recordings

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]