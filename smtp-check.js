// Basic SMTP connectivity check using raw socket connection
const net = require('net');
require('dotenv').config();

// Get SMTP settings from environment variables or use defaults
const host = process.env.SMTP_HOST || 'mail.cultusedu.com';
const port = parseInt(process.env.SMTP_PORT || '465', 10);

console.log(`Testing basic connectivity to ${host}:${port}...`);

// For non-secure connections (port 25, 587, etc.)
function testNonSecure() {
  const client = net.createConnection({
    host,
    port: 587, // Try with standard submission port
  }, () => {
    console.log('Connected to SMTP server!');
    
    // Send a EHLO command to check if server responds
    client.write('EHLO localhost\r\n');
    
    // Set timeout to close connection if there's no response
    setTimeout(() => {
      console.log('No response from server within timeout period.');
      client.end();
    }, 5000);
  });
  
  client.on('data', (data) => {
    console.log('Server response:', data.toString());
    client.end();
  });
  
  client.on('error', (err) => {
    console.error('Connection error:', err.message);
  });
  
  client.on('end', () => {
    console.log('Disconnected from server');
  });
}

// For secure connections (port 465)
function testSecure() {
  const tls = require('tls');
  
  const options = {
    host,
    port,
    rejectUnauthorized: false
  };
  
  console.log('Attempting secure TLS connection...');
  
  const client = tls.connect(options, () => {
    console.log('TLS connection established');
    console.log('Server authorized:', client.authorized);
    
    // Send EHLO command
    client.write('EHLO localhost\r\n');
    
    // Set timeout to close connection if there's no response
    setTimeout(() => {
      console.log('No response from server within timeout period.');
      client.end();
    }, 5000);
  });
  
  client.on('data', (data) => {
    console.log('Server response:', data.toString());
    
    // Try to authenticate
    console.log('Sending AUTH LOGIN command...');
    client.write('AUTH LOGIN\r\n');
    
    // Note: This is just a basic connectivity test
    // We're not completing the authentication flow
  });
  
  client.on('error', (err) => {
    console.error('TLS connection error:', err.message);
  });
  
  client.on('end', () => {
    console.log('TLS connection closed');
  });
}

// Determine which test to run based on port
if (port === 465) {
  testSecure();
} else {
  testNonSecure();
} 