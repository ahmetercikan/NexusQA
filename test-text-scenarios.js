#!/usr/bin/env node

/**
 * Test script for text-to-scenarios API
 * Tests the new POST /api/documents/generate-from-text endpoint
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3002/api';

async function testTextToScenarios() {
  try {
    console.log('🧪 Testing Text-to-Scenarios API...\n');

    // Test 1: Generate scenarios from text with standard template
    console.log('Test 1: Standard Text Format');
    console.log('-------------------------------');
    const response1 = await axios.post(`${BASE_URL}/documents/generate-from-text`, {
      content: 'Kullanıcı sisteme login yapabilmeli. Email ve şifre ile giriş yapması gerekiyor. Giriş başarılı olursa ana sayfaya yönlendirilsin.',
      projectId: 2,
      suiteId: 3,
      template: 'text'
    });

    console.log('✓ Request successful (HTTP 201)');
    console.log('Response:', JSON.stringify(response1.data, null, 2));
    const docId1 = response1.data.document?.id;
    console.log('\n');

    // Test 2: Generate scenarios from text with BDD template
    console.log('Test 2: BDD/Gherkin Format');
    console.log('---------------------------');
    const response2 = await axios.post(`${BASE_URL}/documents/generate-from-text`, {
      content: 'Sistem arama fonksiyonunu desteklemeli. Kullanıcı ürün araması yapabileceği, sonuçların listelendiği bir sayfa olmalı.',
      projectId: 2,
      suiteId: 3,
      template: 'bdd'
    });

    console.log('✓ Request successful (HTTP 201)');
    console.log('Response:', JSON.stringify(response2.data, null, 2));
    const docId2 = response2.data.document?.id;
    console.log('\n');

    // Test 3: Verify documents were created
    console.log('Test 3: Verify Documents Created');
    console.log('--------------------------------');
    const allDocsResponse = await axios.get(`${BASE_URL}/documents`);
    const documents = allDocsResponse.data.documents;
    
    console.log(`✓ Total documents: ${documents.length}`);
    console.log(`✓ Documents in system: ${documents.map(d => `${d.id}:${d.filename}`).join(', ')}`);
    console.log('\n');

    // Test 4: Check document details including scenarios
    if (docId1) {
      console.log(`Test 4: Document Details (ID: ${docId1})`);
      console.log('----------------------------------');
      
      // Add small delay to allow backend async processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const docResponse = await axios.get(`${BASE_URL}/documents/${docId1}`);
      const doc = docResponse.data.document;
      
      console.log(`✓ Document: ${doc.filename}`);
      console.log(`✓ Status: ${doc.status}`);
      console.log(`✓ Scenario Count: ${doc.scenarioCount}`);
      console.log(`✓ Metadata:`, doc.metadata);
      
      if (doc.scenarios && doc.scenarios.length > 0) {
        console.log(`✓ Scenarios:`);
        doc.scenarios.forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.title}`);
          console.log(`     Description: ${s.description}`);
          console.log(`     Steps: ${s.steps?.length || 0}`);
        });
      }
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.message) {
      console.error('Error:', error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the test
testTextToScenarios();
