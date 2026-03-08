import { runBenchmarkSuite, exportBenchmarkToFile } from './packages/physics/src/benchmark/benchmark';
const results = runBenchmarkSuite();
console.log(JSON.stringify(results, null, 2));
exportBenchmarkToFile(results);
