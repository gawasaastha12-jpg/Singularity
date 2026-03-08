import { runScalableSuite, printScalableReport } from './scalable';
console.log("Starting Scalability Benchmark Suite...");
const results = runScalableSuite();
printScalableReport(results);
