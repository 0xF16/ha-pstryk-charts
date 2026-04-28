ARG BUILD_FROM
FROM $BUILD_FROM

# Install python and dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    freetype-dev \
    libpng-dev \
    jpeg-dev \
    zlib-dev \
    build-base

# Set up working directory
WORKDIR /app

# Copy files
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY pstryk_chart.py .
COPY run.sh .

# Set permissions
RUN chmod a+x run.sh

# Entry point
CMD [ "./run.sh" ]
