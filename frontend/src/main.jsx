import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import {ApolloProvider} from "@apollo/client/react"
import client from './apolloClient.js'
import {BrowserRouter} from "react-router-dom";
import { Toaster } from "react-hot-toast";
//new for deployement
import "./style.css";




createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <Toaster position="top-right" />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </StrictMode>
);
