import { createRouter, createWebHistory } from "vue-router";
import HomePage from "@/components/Home.vue";
import FileReaderPage from "@/components/FileReader.vue";
const routes = [
  {
    path: "/",
    name: "home",
    component: HomePage,
  },
  {
    path: "/file",
    name: "file",
    component: FileReaderPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
