# V K Paints Selection & Ordering Platform

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
