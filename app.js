const path = require('path');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { graphqlHTTP } = require('express-graphql');
const { createServer } = require('http');
const fs = require('fs');
const { useServer } = require('graphql-ws/lib/use/ws');
const { WebSocketServer } = require('ws');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// MongoDB connection URI and session store
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@leaderboard.xsvdpkh.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
app.set('trust proxy', 1); // very important behind proxy like Caddy or ALB

// CORS configuration for frontend origins
app.use(cors({
  origin: [
    'http://localhost:5173', // local frontend
    'https://leaderboard-frontend.darshanvachhani.store', // production frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse incoming JSON requests
app.use(bodyParser.json()); // application/json

// Session middleware with MongoDB store
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 15, // 15 minutes
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  }
}));

// GraphQL schema and resolvers
const graphqlSchema = require('./graphql/schema');
const graphqlResolvers = require('./graphql/resolvers');

// Create executable GraphQL schema
const schema = makeExecutableSchema({
  typeDefs: graphqlSchema,
  resolvers: graphqlResolvers
});

// Access log stream for HTTP requests
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// HTTP request logging
app.use(morgan('combined', { stream: accessLogStream })); // Logging

// GraphQL endpoint with custom error formatting
app.use('/graphql', (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    try {
      const parsed = JSON.parse(body);
      if (parsed.errors) {
        res.statusCode = 200; // Force OK for Apollo
      }
    } catch (error) {
      console.error('Failed to parse response body:', body);
    }
    return originalSend.call(this, body);
  };

  graphqlHTTP({
    schema,
    graphiql: true,
    customFormatErrorFn: (err) => {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An error occurred.';
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    }
  })(req, res, next);
});

// Connect to MongoDB and start HTTP & WebSocket servers
mongoose
  .connect(
    MONGODB_URI,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(result => {
    const httpServer = createServer(app);
    // Set up WebSocket server for GraphQL subscriptions
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql',
    });
    useServer({
      schema: schema,
    }, wsServer);
    httpServer.listen(process.env.PORT || 8080, () => {
      console.log(`Server is running on http://localhost:${process.env.PORT || 8080}/graphql`);
      console.log(`WebSocket server is running on ws://localhost:${process.env.PORT || 8080}/graphql`);
    });
  })
  .catch(err => console.log(err));
