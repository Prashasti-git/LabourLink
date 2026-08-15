import Hero from '../components/Hero';
import SearchJobs from '../components/SearchJobs';
import { About, Audience, Faq, Newsletter, Steps, Testimonials, TrustStrip } from '../components/ContentSections';
export default function HomePage({ notify }) { return <main><Hero notify={notify} /><TrustStrip /><About /><SearchJobs notify={notify} /><Testimonials /><Audience /><Steps /><Faq /><Newsletter notify={notify} /></main>; }
