# LLM Chat Application

A simple chat application that integrates with LM Studio for local LLM inference.

## Project Structure

```
llmchat/
├── frontend/          # React + Vite frontend
│   ├── public/        # Static assets
│   └── src/           # React components
│       ├── App.jsx    # Main app component
│       ├── main.jsx   # Entry point
│       └── components/
│           └── ChatWidget.jsx  # Chat interface component
├── backend/           # Node.js + Express backend
│   └── server.js     # API server
├── .env               # Environment variables
├── package.json       # Root package config
└── README.md          # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Configure LM Studio

- Open LM Studio and download/install your preferred model
- Start the LM Studio server (usually on port 1234)
- Get your API token from Settings → General → API Token
- Update `.env` file with your configuration:

```env
LM_STUDIO_URL=http://localhost:1234
API_TOKEN=your_token_here
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Replace Model Name in Backend Code

Edit `backend/server.js` and replace `'your_model_name_here'` with your actual model name from LM Studio (e.g., 'llama-2', 'mistral', etc.)

### 4. Run the Application

Start both frontend and backend:

```bash
npm run dev:frontend & npm start:backend
# Or in separate terminals:
npm run dev:frontend
npm start:backend
```

### 5. Access the App

Open your browser and navigate to `http://localhost:3000` or `http://localhost:5173` (depending on which frontend you use)

## Features

- Real-time chat interface with LM Studio
- Responsive design using React
- Clean, modern UI with Tailwind-like styling
- Error handling and loading states

## Technologies Used

### Backend
- Node.js
- Express
- dotenv for environment variables

### Frontend
- React 18
- Vite (build tool)
- Axios (HTTP client)
- TypeScript

## License

MIT
