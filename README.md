# GraphQL---Blog

This is a Node.js backend application that provides a powerful GraphQL API for managing posts and user profiles. 
The API allows users to perform CRUD (Create, Read, Update, Delete) operations on posts and also manage user accounts. 
It is built using Node.js, Express, MongoDB, and GraphQL.

# Features
- GraphQL API: Provides a powerful GraphQL API for managing posts and user profiles. 
  GraphQL allows clients to request only the data they need, reducing over-fetching and improving performance.
- Post Management: Create, Read, Update, and Delete posts with title, content, and image.
- User Authentication: Allow users to sign up and log in to manage their posts.
- JSON Web Token (JWT) Authentication: Protect sensitive endpoints using JWT-based authentication.
- User Status: Users can update and retrieve their status message.
- Error Handling: Detailed error messages for better debugging and user feedback.

## Installation and Setup

1. Clone the repository: git clone https://github.com/7AkhilV/GraphQL---Blog.git
2. Install dependencies: npm install
3. Set up environment variables:
Create a `.env` file in the root directory and set any necessary environment variables, such as:
MONGODB_URI
PORT
JWT_TOKEN
4. Start the server: 
The server will be running at `http://localhost:8080`.

# Usage
To use the GraphQL API, you can make requests to the `/graphql` endpoint using a tool like GraphiQL or Postman.

# Authentication
The API uses JSON Web Tokens (JWT) for authentication. 
To access protected endpoints, you need to include the JWT token in the `Authorization` header of your requests. 
The token can be obtained by making a successful login request.
