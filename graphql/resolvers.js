const bcrypt = require('bcryptjs');
const validator = require('validator');
const { PubSub } = require('graphql-subscriptions');

const Player = require('../models/player');
const User = require('../models/user');

const pubsub = new PubSub();

const throwError = (message, code, data) => {
  const error = new Error(message);
  error.code = code || 500;
  if (data) error.data = data;
  throw error;
};

const Query = {
  getAllPlayers: async () => {
    const players = await Player.find().sort({ score: -1 });
    return players.map(player => ({
      ...player._doc,
      playerId: player._id.toString(),
      updatedAt: player.updatedAt.toISOString(),
      createdAt: player.createdAt.toISOString(),
    }));
  },
  session: async (_, __, req) => {
    if (!req.session?.isLoggedIn) return { isLoggedIn: false, userId: '', email: '', name: '' };
    const user = await User.findOne({ _id: req.session.userId });
    return { isLoggedIn: true, userId: user._id.toString(), email: user.email, name: user.name };
  }
};

const Mutation = {
  createPlayer: async (_, { playerInput }, req) => {
    if (!req.session?.isLoggedIn) throwError('Not authenticated.', 401);

    const { name, score } = playerInput;
    const errors = [];

    if (!/^[a-zA-Z0-9 ]+$/.test(name)) errors.push({ message: 'Invalid Name.' });
    if (!validator.isNumeric(score.toString()) || score < 0)
      errors.push({ message: 'Invalid score.' });

    if (errors.length > 0) throwError('Invalid input.', 422, errors);

    const existingPlayer = await Player.findOne({ name });
    if (existingPlayer) {
      throwError('Player already exists.', 422, [{ message: 'Duplicate player name.' }]);
    }

    const player = new Player({ name, score });
    const created = await player.save();

    const newPlayer = {
      ...created._doc,
      playerId: created._id.toString(),
      updatedAt: created.updatedAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };

    pubsub.publish('UPSERT_PLAYER', { upsertPlayer: newPlayer });

    return newPlayer;
  },

  updatePlayer: async (_, { playerInput }, req) => {
    if (!req.session?.isLoggedIn) throwError('Not authenticated.', 401);

    const { playerId, name, score } = playerInput;
    const errors = [];
    const player = await Player.findById(playerId);
    if (!player) throwError('Player not found.', 404);

    if (!/^[a-zA-Z0-9 ]+$/.test(name)) errors.push({ message: 'Invalid Name.' });
    if (!validator.isNumeric(score.toString()) || score < 0)
      errors.push({ message: 'Invalid score.' });

    if (errors.length > 0) throwError('Invalid input.', 422, errors);

    player.name = name;
    player.score = score;
    const updated = await player.save();

    const updatedPlayer = {
      ...updated._doc,
      playerId: updated._id.toString(),
      updatedAt: updated.updatedAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    };

    pubsub.publish('UPSERT_PLAYER', { upsertPlayer: updatedPlayer });

    return updatedPlayer;
  },

  deletePlayer: async (_, { playerId }, req) => {
    if (!req.session?.isLoggedIn) throwError('Not authenticated.', 401);

    const player = await Player.findById(playerId);
    if (!player) throwError('Player not found.', 404);

    await Player.deleteOne({ _id: playerId });
    const deletedPlayer = {
      ...player._doc,
      playerId: player._id.toString(),
      name: player.name,
      score: player.score,
      updatedAt: player.updatedAt.toISOString(),
      createdAt: player.createdAt.toISOString(),
    };
    pubsub.publish('DELETE_PLAYER', { deletePlayer: deletedPlayer });
    return deletedPlayer;
  },

  createUser: async (_, { userInput }) => {
    if (!req.session?.isLoggedIn) throwError('Not authenticated.', 401);
    const { email, password, name } = userInput;
    const errors = [];

    if (!validator.isEmail(email)) errors.push({ message: 'Invalid email.' });
    if (!validator.isLength(password, { min: 5 }))
      errors.push({ message: 'Password too short.' });
    if (!/^[a-zA-Z0-9 ]+$/.test(name)) errors.push({ message: 'Invalid Name.' });

    if (errors.length > 0) throwError('Invalid input.', 422, errors);

    const existing = await User.findOne({ email });
    if (existing) throwError('User already exists.', 422);

    const hashedPw = await bcrypt.hash(password, 12);

    const user = new User({ email, password: hashedPw, name });
    const createdUser = await user.save();

    return {
      userId: createdUser._id.toString(),
      email: createdUser.email,
      name: createdUser.name,
    };
  },

  login: async (_, { email, password }, req) => {
    const user = await User.findOne({ email });
    if (!user) throwError('User not found.', 404);

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throwError('Incorrect password.', 422);

    req.session.isLoggedIn = true;
    req.session.userId = user._id.toString();
    await req.session.save();
    return { userId: user._id.toString(), email: user.email, name: user.name, isLoggedIn: true };
  },

  logout: async (_, __, req) => {
    if (!req.session?.isLoggedIn) throwError('Not authenticated.', 401);

    req.session.destroy();

    return { message: 'Logged out successfully.' };
  },
};

const Subscription = {
  upsertPlayer: {
    subscribe: () => pubsub.asyncIterableIterator('UPSERT_PLAYER'),
  },
  deletePlayer: {
    subscribe: () => pubsub.asyncIterableIterator('DELETE_PLAYER'),
  }
};

module.exports = {
  Query,
  Mutation,
  Subscription
};
