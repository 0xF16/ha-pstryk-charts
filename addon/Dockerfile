ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install python and pre-compiled libraries
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-matplotlib \
    py3-numpy \
    py3-pillow \
    py3-requests \
    bash \
    jq

# Set up working directory
# Copy files
COPY pstryk_chart.py /app/
COPY run.sh /run.sh

# Set permissions
RUN chmod a+x /run.sh

# Entry point
ENTRYPOINT [ "/run.sh" ]
