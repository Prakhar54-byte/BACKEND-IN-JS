import axios from "axios";

export const triggerVideoWebhook = async (eventType,videoData)=>{
    const webhookUrl = process.env.VIDEO_WEBHOOK_URL;

    try {
await axios.post(webhookUrl,{
        event: eventType,
        data:{
            video:videoData,
            metadata:{
                timestamo:new Date().toISOString(),
                source: 'spark-analytics',
            }
        }
})
    } catch (error) {
        console.error('Error triggering video webhook:', error);
        throw error;
        
    }
}