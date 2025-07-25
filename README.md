# Leaderboard Backend

This is a Node.js backend for a leaderboard application using Express, GraphQL, MongoDB, and session-based authentication.

## Features
- GraphQL API for player and user management
- MongoDB for data storage
- Session-based authentication with MongoDB session store
- CORS support for local and production frontends
- WebSocket support for GraphQL subscriptions
- Logging with morgan

## Getting Started

### Prerequisites
- Node.js (v22.12.0 recommended)
- MongoDB Atlas

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/darshanvd/leaderboard-backend.git
   cd Leaderboard_Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Environment Variables
Create a `.env` file or set these variables in your environment:
```
MONGO_USER=your_mongo_user
MONGO_PASSWORD=your_mongo_password
MONGO_DEFAULT_DATABASE=leaderboard
SESSION_SECRET=your_strong_secret
```

### Running the Server
- Development:
  ```bash
  npm run start:dev
  ```
- Production:
  ```bash
  npm start
  ```

### Endpoints
- Local GraphQL: `http://localhost:8080/graphql`
- Local Subscriptions: `ws://localhost:8080/graphql`
- **Production GraphQL:** `https://leaderboard.darshanvachhani.store/graphql`

## Deployment on AWS EC2 & Caddy for this project

### 1. Launch EC2 Instance
- Use Ubuntu or Amazon Linux.
- Open ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) in security group.

### 2. Install Node.js & MongoDB
- Install Node.js v22.12.0 (use `.nvmrc`):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc
  nvm install
  nvm use
  ```

### 3. Clone & Setup Project
```bash
git clone https://github.com/darshanvd/leaderboard-backend.git
cd Leaderboard_Backend
npm install
```
Set environment variables in `.env` or your process manager (see above).

### 4. Install & Configure Caddy For Producation EC2 Instance
- [Caddy](https://caddyserver.com/) is a modern web server with automatic HTTPS.
- Install Caddy:
  ```bash
  sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo apt-key add -
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update
  sudo apt install caddy
  ```
- Example `Caddyfile`:
  ```Caddyfile
  leaderboard.darshanvachhani.store {
    reverse_proxy localhost:8080
  }
  ```
- Place `Caddyfile` at `/etc/caddy/Caddyfile` and reload Caddy:
  ```bash
  sudo systemctl reload caddy
  ```

### 5. Start the Node.js App
- For production, use a process manager like PM2 or systemd:
  ```bash
  npm start
  # or
  pm2 start app.js --name leaderboard-backend
  ```

### 6. Access Production Endpoint
- GraphQL: https://leaderboard.darshanvachhani.store/graphql

### 7. (Optional) Route 53 Hosted Zone Setup for Custom Domain

To map domain (e.g., leaderboard.darshanvachhani.store) to EC2 instance:

1. Go to AWS Route 53 and create a Hosted Zone for your domain if you haven't already.
2. In the Hosted Zone, create an **A Record**:
   - Name: `leaderboard` (or leave blank for root domain)
   - Type: `A`
   - Value: Your EC2 public IP address (or Elastic IP if you use one)
   - TTL: 300 (default)
3. If using a subdomain, you can use a CNAME record pointing to your main domain or an ALIAS record if supported.
4. Wait for DNS propagation (can take a few minutes).
5. Ensure your security group allows HTTP/HTTPS traffic.

Now your domain will point to your EC2 instance, and Caddy will handle HTTPS automatically.

---

## Project Structure
- `app.js` - Main server file
- `graphql/` - GraphQL schema and resolvers
- `models/` - Mongoose models
- `middleware/` - Custom middleware (e.g., auth)

## Security Notes
- Use a strong `SESSION_SECRET` in production
- Set up proper CORS origins for frontend
- For production, use HTTPS and set `secure: true` for cookies

