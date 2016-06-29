FROM node:argon

# Create chat directory
RUN mkdir -p /app
WORKDIR /app



# Bundle chat source
COPY . /app

RUN chmod +x run.sh
CMD ./run.sh


