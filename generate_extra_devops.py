import os

os.makedirs(".github/workflows", exist_ok=True)
os.makedirs("k8s/monitoring", exist_ok=True)

with open(".github/workflows/ci-cd.yml", "w") as f:
    f.write("""name: CI/CD Pipeline

on:
  push:
    branches:
      - main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api-gateway, user-service, product-service, quotation-service, order-service, retailer-service, notification-service, frontend]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ./${{ matrix.service }}
          push: true
          tags: yourdockerhub/${{ matrix.service }}:latest
""")

with open("k8s/argocd-app.yaml", "w") as f:
    f.write("""apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: smart-paint-platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/yourusername/smart-paint-platform.git'
    targetRevision: HEAD
    path: k8s
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: smart-paint
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
""")

with open("k8s/monitoring/prometheus-grafana.yaml", "w") as f:
    f.write("""# Minimal configuration for Prometheus & Grafana
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus
        ports:
        - containerPort: 9090
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
""")

with open("README.md", "w") as f:
    f.write("""# Smart Paint Selection & Ordering Platform

This is a complete end-to-end production-ready web application designed with a microservices architecture.

## Microservices
- **API Gateway**: Entry point for routing requests.
- **User Service**: Authentication and role-based access.
- **Product Service**: Manages the paint catalog.
- **Quotation Service**: Calculates paint requirements and costs.
- **Retailer Service**: Finds nearest retailer based on location.
- **Order Service**: Core orchestration for order placement.
- **Notification Service**: Event-driven notification simulator via RabbitMQ.
- **Frontend**: React/Vite responsive application.

## Technologies Used
- Node.js & Express
- React (Vite)
- PostgreSQL
- RabbitMQ
- Docker & Docker Compose
- Kubernetes & ArgoCD (GitOps)
- GitHub Actions (CI/CD)
- Prometheus & Grafana (Monitoring)

## How to Run Locally

```bash
# Start all microservices, databases, and message broker
docker-compose up --build -d
```

Frontend will be available at: http://localhost:5173
API Gateway will be available at: http://localhost:3000

## Kubernetes Deployment
All Kubernetes manifests are located in the `k8s/` directory.
You can apply them directly to your cluster:
```bash
kubectl apply -f k8s/
```
""")

print("Extra DevOps files generated successfully.")
