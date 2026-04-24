import os

# Create Dockerfiles
services = [
    "api-gateway", "user-service", "product-service", "quotation-service",
    "order-service", "retailer-service", "notification-service"
]

dockerfile_node = """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
"""

for service in services:
    with open(f"{service}/Dockerfile", "w") as f:
        f.write(dockerfile_node)

with open("frontend/Dockerfile", "w") as f:
    f.write("""FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
""")

# Create docker-compose.yml
with open("docker-compose.yml", "w") as f:
    f.write("""version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: user_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"

  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    depends_on:
      - user-service
      - product-service
      - quotation-service
      - order-service
      - retailer-service

  user-service:
    build: ./user-service
    environment:
      - DB_URL=postgres://postgres:postgres@postgres:5432/user_db
      - JWT_SECRET=supersecret
    depends_on:
      - postgres

  product-service:
    build: ./product-service
    environment:
      - DB_URL=postgres://postgres:postgres@postgres:5432/product_db
    depends_on:
      - postgres

  quotation-service:
    build: ./quotation-service
    environment:
      - PORT=3003

  order-service:
    build: ./order-service
    environment:
      - DB_URL=postgres://postgres:postgres@postgres:5432/order_db
      - RABBITMQ_URL=amqp://rabbitmq
    depends_on:
      - postgres
      - rabbitmq

  retailer-service:
    build: ./retailer-service
    environment:
      - DB_URL=postgres://postgres:postgres@postgres:5432/retailer_db
    depends_on:
      - postgres

  notification-service:
    build: ./notification-service
    environment:
      - RABBITMQ_URL=amqp://rabbitmq
    depends_on:
      - rabbitmq

  frontend:
    build: ./frontend
    ports:
      - "5173:80"

volumes:
  pgdata:
""")

# Create DB init script
with open("init-db.sql", "w") as f:
    f.write("""CREATE DATABASE product_db;
CREATE DATABASE order_db;
CREATE DATABASE retailer_db;
""")

# Create Kubernetes YAMLs
os.makedirs("k8s", exist_ok=True)

with open("k8s/postgres.yaml", "w") as f:
    f.write("""apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          value: postgres
        ports:
        - containerPort: 5432
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
""")

with open("k8s/rabbitmq.yaml", "w") as f:
    f.write("""apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
spec:
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3-management-alpine
        ports:
        - containerPort: 5672
        - containerPort: 15672
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
spec:
  selector:
    app: rabbitmq
  ports:
  - name: amqp
    port: 5672
  - name: management
    port: 15672
""")

for service in services:
    with open(f"k8s/{service}.yaml", "w") as f:
        f.write(f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: {service}
spec:
  selector:
    matchLabels:
      app: {service}
  template:
    metadata:
      labels:
        app: {service}
    spec:
      containers:
      - name: {service}
        image: {service}:latest
        imagePullPolicy: Never
        env:
        - name: DB_URL
          value: postgres://postgres:postgres@postgres:5432/{service.replace('-service', '')}_db
        - name: RABBITMQ_URL
          value: amqp://rabbitmq
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: {service}
spec:
  selector:
    app: {service}
  ports:
  - port: 80
    targetPort: 3000
""")

print("DevOps files generated successfully.")
