require("dotenv").config();

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const repository = require("./repository/postgresRepository");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Task API",
            version: "1.0.0",
            description: "A simple CRUD Task API"
        },
        servers: [
            {
                url: `http://localhost:${PORT}`
            }
        ]
    },
    apis: ["./index.js"]
};

const swaggerSpec = swaggerJsdoc(options);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root Endpoint
app.get("/", (req, res) => {
    res.json({
        name: "Task API",
        version: "1.0",
        endpoints: ["/tasks"]
    });
});

// Health Endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     responses:
 *       200:
 *         description: Returns all tasks
 */

// Get all tasks
app.get("/tasks", async (req, res) => {
    try {
        const tasks = await repository.getAllTasks();
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

// Get task by ID
app.get("/tasks/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const task = await repository.getTaskById(id);

        if (!task) {
            return res.status(404).json({
                error: `Task ${id} not found`
            });
        }

        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

// Create task
app.post("/tasks", async (req, res) => {
    try {
        const { title } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json({
                error: "Title is required"
            });
        }

        const newTask = await repository.createTask(title);

        res.status(201).json(newTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

// Update task
app.put("/tasks/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const existingTask = await repository.getTaskById(id);

        if (!existingTask) {
            return res.status(404).json({
                error: `Task ${id} not found`
            });
        }

        const { title, done } = req.body;

        if (title !== undefined && title.trim() === "") {
            return res.status(400).json({
                error: "Title cannot be empty"
            });
        }

        const updatedTask = await repository.updateTask(
            id,
            title,
            done
        );

        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const deletedTask = await repository.deleteTask(id);

        if (!deletedTask) {
            return res.status(404).json({
                error: `Task ${id} not found`
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});