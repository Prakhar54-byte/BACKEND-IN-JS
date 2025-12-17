import { Kafka, Partitioners } from "kafkajs";

const kafka = new Kafka({
    clientId:'spark-video-event-producer',
    brokers:[process.env.KAFKA_BROKER || 'localhost:9092']
})

const isTestEnv = Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === 'test';

let producer;

const getProducer = () => {
    if (isTestEnv) return null;
    if (producer) return producer;

    // KafkaJS v2 changed default partitioner; keep legacy behavior.
    producer = kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
    });
    return producer;
};


export const connectProducer = async ()=>{
    const p = getProducer();
    if (!p) return;
    await p.connect();
    console.log('Kafka producer connected');
}

export const sendVideoEvent = async (eventType , videoData)=>{
    const p = getProducer();
    if (!p) return;
    await p.send({
        topic: process.env.KAFKA_VIDEO_TOPIC || 'video-events',
        messages:[
            {
                value:JSON.stringify({
                    ...videoData,
                    eventType,
                    timestamp: new Date().toISOString()
                }),
            }
        ]
    })
}



// Disconnect the producer when the application is shutting down
process.on('SIGINT', async () => {
    try {
        const p = getProducer();
        if (p) {
            await p.disconnect();
            console.log('Kafka producer disconnected');
        }
    } catch {
        // ignore
    }
    process.exit(0);
});