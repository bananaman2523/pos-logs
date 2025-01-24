<template>
  <div>
    <h1>Split Log File by Date</h1>
    <input type="file" @change="handleFileUpload" />
    <div v-if="chunks.length">
      <h3>Select a File to View and Download</h3>
      <select v-model="selectedChunk" @change="loadChunkContent">
        <option v-for="(chunk, index) in chunks" :key="index" :value="chunk.url">
          {{ chunk.name }}
        </option>
      </select>

      <div v-if="chunkContent.length">
        <h4>File Content</h4>
        <table border="1">
          <thead>
            <tr>
              <th>Line Number</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in chunkContent" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ line }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <a v-if="selectedChunk" :href="selectedChunk" download>
        Download Selected File
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const chunks = ref([]); // Holds the split file chunks
const selectedChunk = ref(null); // The selected file to download
const chunkContent = ref([]); // Holds the content of the selected chunk

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }

  const chunkSize = 10 * 1024 * 1024; // 10MB per chunk
  const reader = new FileReader();
  let start = 0;
  const dateGroups = {};

  const processChunk = () => {
    if (start >= file.size) {
      generateFilesByDate(dateGroups, file.name);
      return;
    }

    const chunk = file.slice(start, start + chunkSize);
    reader.onload = (e) => {
      const content = e.target.result;
      splitChunkByDate(content, dateGroups);
      start += chunkSize;
      processChunk();
    };

    reader.readAsText(chunk);
  };

  processChunk();
};

const splitChunkByDate = (content, dateGroups) => {
  const lines = content.split("\n");
  let lastDate = null;

  lines.forEach((line) => {
    const match = line.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      lastDate = match[0];
      if (!dateGroups[lastDate]) {
        dateGroups[lastDate] = [];
      }
      dateGroups[lastDate].push(line);
    } else if (lastDate) {
      dateGroups[lastDate].push(line);
    }
  });
};

const generateFilesByDate = (dateGroups, originalFileName) => {
  chunks.value = Object.entries(dateGroups).map(([date, lines]) => {
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const chunkName = `${originalFileName}_${date}.log`;
    const chunkUrl = URL.createObjectURL(blob);

    return {
      name: chunkName,
      url: chunkUrl,
    };
  });
};

// Function to load the content of the selected file and display it in a table
const loadChunkContent = () => {
  const selected = chunks.value.find(chunk => chunk.url === selectedChunk.value);
  if (selected) {
    fetch(selected.url)
      .then(response => response.text())
      .then(data => {
        chunkContent.value = data.split("\n"); // Split content by line and update table
      })
      .catch(error => {
        console.error('Error loading chunk content:', error);
      });
  }
};

// Function to handle file download when a selection is made
const downloadFile = () => {
  if (selectedChunk.value) {
    const link = document.createElement('a');
    link.href = selectedChunk.value;
    link.download = selectedChunk.value.split('/').pop(); // Extract file name from the URL
    link.click();
  }
};
</script>

<style>
h1 {
  font-family: Arial, sans-serif;
}

select {
  margin-top: 10px;
}

table {
  margin-top: 20px;
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px;
  text-align: left;
}

a {
  display: block;
  margin-top: 10px;
  color: blue;
  text-decoration: underline;
  cursor: pointer;
}
</style>
