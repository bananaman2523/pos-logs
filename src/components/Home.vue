<template>
  <div id="app">
    <header>
      <h1>Log File Viewer</h1>
    </header>

    <section>
      <div>
        <input type="file" @change="handleFileUpload" accept=".log" style="margin-right: 16px;"/>
        <select v-if="chunks.length" v-model="selectedChunk" @change="loadChunkContent">
          <option v-for="(chunk, index) in chunks" :key="index" :value="chunk.url">
            {{ chunk.name }}
          </option>
        </select>
      </div>
      
      <div>
        <button @click="downloadLogs('log')" :disabled="!logs.length" style="margin-right: 16px;">Download as .log</button>
        <button @click="downloadLogs('csv')" :disabled="!logs.length">Download as .csv</button>
      </div>

      <div v-if="logs.length" class="log-summary">
        <p>Total Logs: {{ logs.length }} | Errors: {{ errorCount }} | Warnings: {{ warnCount }} | Info : {{
          noLevelCount }}</p>
        <div class="select-count">
          <div v-if="restartCount.lengthCount > 0" style="display: flex;justify-content: center;">
            <p>RESTART: {{ restartCount.lengthCount }} </p>
            <select v-if="restartCount.lengthCount > 0" id="restartDropdown" v-model="selectedRestart" @change="scrollToRow(selectedRestart)" style="margin: 16px;">
              <option v-for="(log, index) in (restartCount.dropdown)" :key="index" :value="log.id">
                [{{ log.id }}] : {{ log.timestamp }} {{ log.message }}
              </option>
            </select>
          </div>

          <div v-if="shutdownCount.lengthCount > 0" style="display: flex;justify-content: center;">
            <p>SHUTDOWN: {{ shutdownCount.lengthCount }} </p>
            <select id="shutdownDropdown" v-model="selectedShutdown" @change="scrollToRow(selectedShutdown)" style="margin: 16px;">
              <option v-for="(log, index) in (shutdownCount.dropdown)" :key="index" :value="log.id">
                [{{ log.id }}] : {{ log.timestamp }} {{ log.message }}
              </option>
            </select>
          </div>
        </div>

      </div>

      <div class="table">
        <table v-if="logs.length">
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th style="width: 60px;">Timestamp</th>
              <th style="width: 150px;">Level</th>
              <th style="width: 800px;">Message</th>
              <!-- <th style="width: 300px;">Details</th> -->
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, index) in filteredLogs" :key="index" :id="index + 1" :class="{
              'warn-level': log.level.toLowerCase() === 'warn',
              'error-level': log.level.toLowerCase() === 'error',
              'fatal-level': log.level.toLowerCase() === 'fatal',
              'no-level': log.level === '',
            }">
              <td>{{ index + 1 }}</td>
              <td style="width: 200px;">{{ log.timestamp }}</td>
              <td>{{ log.level }}</td>
              <td class="details">{{ log.message }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>No logs to display. Please upload a .log file.</p>
      </div>


    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const logs = ref([]);
const selectedDate = ref('');
const selectedShutdown = ref(null); 
const chunks = ref([]);
const selectedChunk = ref(null);
const chunkContent = ref([]);

let worker = null;

const filteredLogs = computed(() => {
  if (!selectedDate.value) {
    return logs.value;
  }

  return logs.value.filter(log => log.timestamp.startsWith(selectedDate.value));
});

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

function convertToLog(logArray) {
    return logArray.join("\n");
}

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

const loadChunkContent = () => {
  const selected = chunks.value.find(chunk => chunk.url === selectedChunk.value);
  if (selected) {
    fetch(selected.url)
      .then(response => response.text())
      .then(data => {
        chunkContent.value = data.split("\n");
        const result = convertToLog(chunkContent.value)
        processLogsWithWorker(result)
        
      })
      .catch(error => {
        console.error('Error loading chunk content:', error);
      });
  }
};

const processLogsWithWorker = (content) => {
  if (!worker) {
    worker = new Worker(new URL('../services/worker.js', import.meta.url));
    worker.onmessage = (e) => {
      const { logs: processedLogs } = e.data;
      logs.value = processedLogs;
    };
  }

  worker.postMessage({ content });
};

const errorCount = computed(() => {
  return filteredLogs.value.filter(log => log.level.toLowerCase() === 'error').length;
});

const warnCount = computed(() => {
  return filteredLogs.value.filter(log => log.level.toLowerCase() === 'warn').length;
});

const noLevelCount = computed(() => {
  return filteredLogs.value.filter(log => log.level.toLowerCase() === 'info').length;
});

const restartCount = computed(() => {
  const data = filteredLogs.value.filter(log => log.message.includes('[VIVIPOS]') && log.message.includes('RESTART'))

  return {
    lengthCount: data.length,
    dropdown: data
  };
});

const shutdownCount = computed(() => {
  const data = filteredLogs.value.filter(log => log.message.includes('[VIVIPOS]') && log.message.includes('SHUTDOWN'))
  
  return {
    lengthCount: data.length,
    dropdown: data
  };
});

const selectedOption = ref('');
const scrollToRow = (rowId) => {
  const row = document.getElementById(rowId);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const downloadLogs = (format) => {
  if (!logs.value.length) return;

  let content, fileType, fileName;

  if (format === 'log') {
    content = filteredLogs.value
      .map(log => `${log.timestamp} : [${log.level}] ${log.message}`)
      .join('\n');
    fileType = 'text/plain';
    fileName = 'filtered_logs.log';
  } else if (format === 'csv') {
    const csvHeader = 'Timestamp,Level,Message\n';
    const csvBody = filteredLogs.value
      .map(log => `"${log.timestamp}","${log.level}","${log.message}"`)
      .join('\n');
    content = csvHeader + csvBody;
    fileType = 'text/csv';
    fileName = 'filtered_logs.csv';
  }

  const blob = new Blob([content], { type: fileType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

window.onbeforeunload = function () {
  window.scrollTo(0, 0);
}
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  margin: 20px;
  text-align: center;
  background-color: #f8f8f8;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

header {
  background-color: #333;
  color: #fff;
  padding: 10px 0;
  border-radius: 8px;
}

h1 {
  font-size: 24px;
  margin: 0;
}

section {
  margin-top: 20px;
  margin-bottom: 1200px;
}

input[type="file"] {
  padding: 10px;
  margin: 20px 0;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #fff;
}

table {
  margin: 20px auto;
  border-collapse: collapse;
  width: 100%;
  max-width: 1200px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}


th,
td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
  font-size: 14px;
}

th {
  background-color: #f4f4f4;
  font-weight: bold;
  color: #333;
}

tbody tr {
  transition: background-color 0.3s ease;
}

tbody tr:hover {
  background-color: #f1f1f1;
}

.details {
  display: block;
  width: 800px;
  overflow-x: auto;
  white-space: nowrap;
  font-size: 13px;
  color: #333;
}

.warn-level {
  background-color: yellow;
  font-weight: bold;
}

.error-level {
  background-color: #ff0000;
  font-weight: bold;
}

.no-level {
  background-color: #fff;
}

.fatal-level {
  background-color: greenyellow;
  font-weight: bold;
}

p {
  font-size: 16px;
  color: #555;
  margin-top: 20px;
}

.select-count{
  display: flex;
  justify-content: center;
  align-items: center;
}

@media (max-width: 768px) {
  table {
    width: 100%;
    font-size: 12px;
  }

  th,
  td {
    padding: 10px;
  }

  .details {
    width: 100%;
  }

  input[type="file"] {
    width: 100%;
  }
}

@media (max-width: 480px) {
  header {
    font-size: 18px;
  }

  h1 {
    font-size: 20px;
  }

  table {
    font-size: 10px;
  }
}
</style>
