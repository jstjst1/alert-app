# News Alert Application

This is a full-stack web application designed to fetch and display the latest news headlines. It is fully containerised using Docker, making the development and deployment process streamlined and consistent across different environments.

The application is composed of several services working in concert:
*   A **React frontend** to provide a dynamic user interface.
*   A **Node.js backend** to serve the API.
*   A **Python Celery worker** for asynchronous background tasks, such as fetching news articles.
*   **MySQL** as the primary database for storing news data.
*   **Redis** as a message broker for Celery and for caching.

---

### Prerequisites

To run this project on your local machine, you will need the following software installed:

*   **Docker Desktop:** The core technology used to run the application. It manages all the containers defined in the `docker-compose.yml` file.
*   **Git:** For version control and to clone the repository.
*   **A Web Browser:** Such as Chrome, Firefox, or Edge to view the application.

---

### Getting Started

Follow these steps to get the application running locally:

1.  **Clone the repository (if applicable) or ensure you are in the project's root directory.**

2.  **Build and run the containers:**
    Open a terminal in the project root (`alert-app`) and run the following command. This will build the images for the custom services and start all containers in the background.
    ```sh
    docker-compose up --build -d
    ```

3.  **Access the application:**
    Once the containers are running, you can access the web application by navigating to:
    [http://localhost:3000](http://localhost:3000)

4.  **Stopping the application:**
    To stop all running containers, use the command:
    ```sh
    docker-compose down
    ```

---

### Project Structure

The project is organised into two main directories:

*   `/frontend_react`: Contains the React single-page application.
*   `/backend`: Contains the Node.js API server and the Python Celery worker.