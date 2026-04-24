#!/bin/bash

set -e

echo "Updating system..."
sudo apt-get update -y

echo "Loading required kernel modules..."
cat <<EOF | sudo tee /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

echo "Applying Kubernetes networking sysctl settings..."
cat <<EOF | sudo tee /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system

echo "Installing required packages..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

echo "Installing containerd..."
sudo apt-get install -y containerd

echo "Configuring containerd..."
sudo mkdir -p /etc/containerd

containerd config default | sudo tee /etc/containerd/config.toml

# Enable systemd cgroup driver
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

echo "Restarting containerd..."
sudo systemctl restart containerd
sudo systemctl enable containerd

echo "Disabling swap..."
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

echo "Adding Kubernetes repository..."

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.34/deb/Release.key | \
sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.34/deb/ /" | \
sudo tee /etc/apt/sources.list.d/kubernetes.list

echo "Updating package list..."
sudo apt-get update -y

echo "Installing Kubernetes components..."
sudo apt-get install -y kubelet kubeadm kubectl

echo "Holding Kubernetes packages..."
sudo apt-mark hold kubelet kubeadm kubectl

echo "Enabling kubelet..."
sudo systemctl enable kubelet

echo "Installation complete!"
echo "You can now initialize the cluster using:"
echo ""
echo "sudo kubeadm init --pod-network-cidr=192.168.0.0/16"
echo ""
echo "Then configure kubectl and install a CNI (Calico/Flannel)."