import Image from "next/image";

const tags = ["EU careers", "Evidence first", "Human reviewed", "ATS aware", "Skills mapped", "No auto-apply"];
export function BrandBackdrop() {
  return <div className="eu-brand-backdrop" aria-hidden="true">
    <div className="eu-brand-orb eu-brand-orb-one" /><div className="eu-brand-orb eu-brand-orb-two" />
    <Image className="eu-brand-watermark" src="/brand/autotime-mark.png" alt="" width={512} height={512} priority={false} />
    <p className="eu-brand-motto">Better applications.<br/>Clearer evidence.<br/>Human decisions.</p>
    <div className="eu-brand-tags">{tags.map((tag)=><span key={tag}>{tag}</span>)}</div>
  </div>;
}
