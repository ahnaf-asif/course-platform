import { defineConfig } from 'orval';

export default defineConfig({
  coursePlatform: {
    input: '../be/docs/openapi.yaml',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/model',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: 'src/lib/axios.ts',
          name: 'axiosInstance',
        },
      },
    },
  },
});
