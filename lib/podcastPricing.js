export const PODCAST_PRICING={
 audioHourlyPence:6500,
 audioThreeHourPence:17500,
 audioSixHourPence:32500,
 videoHourlyPence:9000,
 videoThreeHourPence:25000,
 videoSixHourPence:47500,
 volumeRecordingHourlyPence:5500,
};

export function podcastQuote({hours=0,video=false,volume=false,manualAmountPence=0}={}){
 const h=Math.max(0,Number(hours)||0);
 if(Number(manualAmountPence)>0)return {amountPence:Math.round(Number(manualAmountPence)),ratePence:h?Math.round(Number(manualAmountPence)/h):0,source:'manual'};
 const rate=volume?PODCAST_PRICING.volumeRecordingHourlyPence:(video?PODCAST_PRICING.videoHourlyPence:PODCAST_PRICING.audioHourlyPence);
 return {amountPence:Math.round(h*rate),ratePence:rate,source:volume?'volume':video?'video':'audio'};
}
