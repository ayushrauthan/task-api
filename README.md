# Task API

A simple RESTful CRUD API built with Node.js and Express.

## Features

- Create, Read, Update and Delete tasks
- Input validation
- Proper HTTP status codes
- Swagger UI documentation

## Technologies Used

- Node.js
- Express.js
- Swagger UI

## Installation

```bash
npm install
```

## Run the Server

```bash
node index.js
```

The server runs at:

```
http://localhost:3000
```

Swagger documentation:

```
http://localhost:3000/docs
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/tasks` | Get all tasks |
| GET | `/tasks/:id` | Get a task by ID |
| POST | `/tasks` | Create a new task |
| PUT | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |

## Sample Request

### Create a Task

```json
{
  "title": "Learn Express"
}
```

### Sample Response

```json
{
  "id": 4,
  "title": "Learn Express",
  "done": false
}
```
