module.exports = `
  type Player {
    playerId: ID!
    name: String!
    score: Int!
    updatedAt: String!
    createdAt: String!
  }

  type User {
    userId: ID!
    email: String!
    name: String!
    isLoggedIn: Boolean
  }

  input PlayerInputData {
    name: String!
    score: Int!
    playerId: ID
  }

  input UserInputData {
    email: String!
    password: String!
    name: String!
  }

  type UserData {
    userId: ID!
  }

  type Message {
    message: String!
  }

  type Query {
    getAllPlayers: [Player!]!
    session: User!
   }

  type Mutation {
    createPlayer(playerInput: PlayerInputData): Player!
    updatePlayer(playerInput: PlayerInputData): Player!
    deletePlayer(playerId: ID!): Player!
    createUser(userInput: UserInputData): User!
    login(email: String!, password: String!): User!
    logout: Message!
  }

  type Subscription {
    upsertPlayer: Player!
    deletePlayer: Player!
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`;
