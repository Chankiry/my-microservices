import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class CacheMetricsService {
    private readonly cacheHits    : Counter;
    private readonly cacheMisses  : Counter;
    private readonly cacheLatency : Histogram;

    constructor() {
        // Remove existing metrics before re-registering to survive hot reload
        register.removeSingleMetric('cache_hits_total');
        register.removeSingleMetric('cache_misses_total');
        register.removeSingleMetric('cache_operation_duration_seconds');

        this.cacheHits = new Counter({
            name      : 'cache_hits_total',
            help      : 'Total number of cache hits',
            labelNames: ['cache_type'],
        });

        this.cacheMisses = new Counter({
            name      : 'cache_misses_total',
            help      : 'Total number of cache misses',
            labelNames: ['cache_type'],
        });

        this.cacheLatency = new Histogram({
            name      : 'cache_operation_duration_seconds',
            help      : 'Duration of cache operations in seconds',
            labelNames: ['operation', 'result'],
            buckets   : [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
        });
    }

    recordHit(cache_type: string): void {
        this.cacheHits.inc({ cache_type });
    }

    recordMiss(cache_type: string): void {
        this.cacheMisses.inc({ cache_type });
    }

    recordLatency(operation: string, result: string, duration: number): void {
        this.cacheLatency.observe({ operation, result }, duration);
    }
}