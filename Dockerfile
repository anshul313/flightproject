FROM node:argon

# Create chat directory
RUN mkdir -p /usr/src/chat
WORKDIR /usr/src/chat

# Install chat dependencies
COPY package.json /usr/src/chat/
RUN npm install

# Bundle chat source
COPY . /usr/src/chat
