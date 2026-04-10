import brain from 'brain.js';

const trainingData = [
  { input: "hello", output: "greeting" },
  { input: "hi there", output: "greeting" },
  { input: "hey", output: "greeting" },
  { input: "good morning", output: "greeting" },
  
  { input: "what is my size", output: "sizing" },
  { input: "how do sizes run", output: "sizing" },
  { input: "is this true to size", output: "sizing" },
  { input: "do you have a size guide", output: "sizing" },
  { input: "measurements", output: "sizing" },

  { input: "what is trending", output: "trends" },
  { input: "latest fashion", output: "trends" },
  { input: "new arrivals", output: "trends" },
  { input: "popular items", output: "trends" },
  { input: "recommend an outfit", output: "trends" },

  { input: "what fabric is this", output: "materials" },
  { input: "is it cotton", output: "materials" },
  { input: "how to wash this dress", output: "materials" },
  { input: "care instructions", output: "materials" },

  { input: "where is my order", output: "shipping" },
  { input: "track package", output: "shipping" },
  { input: "delivery time", output: "shipping" },

  { input: "return policy", output: "returns" },
  { input: "how to return", output: "returns" },
  { input: "exchange my shirt", output: "returns" }
];

const responses = {
  greeting: "Hello there! Welcome to Intellishop. I'm your virtual fashion assistant. How can I help you find the perfect outfit today?",
  sizing: "Our clothing generally runs true to size. You can find detailed measurements in the 'Size Guide' link on every product page to ensure the perfect fit!",
  trends: "Check out our 'New Arrivals' section! This season, pastel colors and oversized, comfortable streetwear are dominating the fashion scene.",
  materials: "All material details and care instructions (like cold wash, tumble dry low) are listed under the 'Fabric Care' tab on the item's page.",
  shipping: "Standard shipping for your stylish picks takes 3-5 business days. You can track your order in the 'My Orders' section!",
  returns: "Not your style? No problem! We accept returns within 30 days of purchase for unworn items with tags. Initiate a return from your profile.",
  unknown: "I'm still learning! Could you rephrase your question about our clothing, sizing, shipping, or materials?"
};

let net = null;

export const initAndTrainModel = () => {
    net = new brain.recurrent.LSTM();
    
    net.train(trainingData, {
        iterations: 250,
        errorThresh: 0.011,
        log: true,
    });
    console.log("Fashion Chatbot ML Model Trained successfully");
};

export const getBotResponse = (userInput) => {
    if (!net) initAndTrainModel();
    
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput === "hi" || lowerInput === "hello") return responses.greeting;
    
    try {
        const resultString = net.run(lowerInput);
        if (responses[resultString]) {
            return responses[resultString];
        } else {
             return responses.unknown;
        }
    } catch(e) {
        return responses.unknown;
    }
};
