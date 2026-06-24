// Master resume data — the "ground truth" the AI tailors from.
// It NEVER invents new experience; it only replaces words/lines to match a job description.

export const masterResume = {
  name: "Rishabh Diwaker",
  title: "Senior Video Editor | AI-Driven Post-Production Specialist | Motion Graphics & Content Strategy",
  email: "rishabhdiwakar0012@gmail.com",
  website: "rishabhdiwaker.com",
  linkedin: "linkedin.com/in/rishabhdiwaker0012",
  phone: "+91 8077884422",
  photoUrl: "/resume-photo.jpg", // place your headshot here

  summary:
    "Creative Video Editor with 5 years of experience producing high-engagement content for YouTube, social media, podcasts, and digital platforms. Currently creating video content for the Sri Mandir app at AppsForBharat, reaching 250K+ users directly in-app. Experienced in motion graphics, storytelling, and AI-powered editing workflows using tools like Runway, Sora, VEO, and ElevenLabs. Previously led a team of 8+ editors and designers, delivering media campaigns that improved engagement by 30% and reduced production turnaround time by 20%.",

  keyAchievements: [
    "Created video content for the Sri Mandir app at AppsForBharat, reaching 250K+ users directly upon app launch and improving in-app engagement.",
    "Led a team of 8+ editors and designers, delivering 10+ media campaigns annually and increasing client engagement by 30%.",
    "Increased YouTube watch time by 40% and helped grow channel reach to 127K+ views through optimized storytelling and editing strategies.",
    "Built and managed a music YouTube channel, growing it to 3.7K subscribers and 660K+ total views while developing strong audio engineering and sound design expertise.",
    "Revived the TEDx Manipal University Jaipur Instagram page, increasing reach from 50 average views to 12.8K views in 3 days through promotional teaser trailers.",
  ],

  experience: [
    {
      role: "Video Editor (Content Strategy & Creative Production)",
      company: "AppsForBharat",
      dates: "Jan 2025 - Present",
      location: "Bangalore, KA",
      bullets: [
        "Created high-engagement vertical videos for the Sri Mandir app, viewed by 250K+ users upon app launch, collaborating with product and marketing teams to align content with platform engagement goals.",
        "Drove a 13.39% increase in Story section opens by enhancing visual design, optimizing layouts, and maintaining high-quality daily video output.",
        "Contributed to a 14.29% boost in successful payment conversions and 14% higher event participation through engaging campaigns and creative strategies.",
        "Used Nano Banana, VEO 3, Kling, Runway ML, Eleven Labs, and Envato Elements to enhance content quality, driving a 19% rise in unique shares.",
        "Built a custom Python-based video compression tool that reduced upload time and file size while enabling offline processing.",
      ],
    },
    {
      role: "Head Of Media Production",
      company: "Great Creatives",
      dates: "March 2024 - Jan 2025",
      location: "",
      bullets: [
        "Managed a team of 8+ editors and designers at GreatCreatives, delivering 10+ successful media campaigns yearly and increasing client engagement by 30% with high-quality content.",
        "Improved workflows to cut project turnaround time by 20% while keeping 95% of clients through strong media strategies and reliable delivery.",
      ],
    },
    {
      role: "Video Editor & Graphic Designer",
      company: "Byte Blogger Base",
      dates: "Jul 2023 - Feb 2024",
      location: "",
      bullets: [
        "Consistently delivered high-quality, polished content that boosted subscriber growth by 35% and improved audience retention rates by 25% on YouTube.",
        "Increased average watch time by 40% and expanded the channel's reach to 127k+ views, driven by engaging and well-optimized video content.",
      ],
    },
    {
      role: "Post-Production",
      company: "Web3Config India",
      dates: "Nov 2021 - Jun 2023",
      location: "",
      bullets: [
        "Edited recorded talks for Speakers at Web3Conf India.",
        "Managed color grading, cuts, intros, and audio enhancements.",
        "Delivered polished, professional content to elevate the viewing experience.",
      ],
    },
    {
      role: "Video Editor",
      company: "UpWork (Freelance)",
      dates: "",
      location: "",
      bullets: [
        "Delivered high-quality video editing services to international clients on Upwork, building a strong global portfolio and maintaining repeat collaborations.",
        "Recognized among top-performing video editors in Bangalore on Upwork, driven by consistent delivery and client satisfaction.",
      ],
    },
  ],

  skills: {
    "Video Editing, Motion Design & Sound Design": [
      "Adobe Premiere Pro",
      "Adobe After Effects",
      "Adobe Audition",
      "FL Studio",
    ],
    "AI Video & Automation": ["Runway ML", "Nano Banana", "Kling", "VEO", "ElevenLabs", "Topaz Video AI", "HeyGen", "Descript"],
    "Design & Creative Tools": ["Adobe Photoshop", "Figma", "Canva Pro", "Adobe Firefly", "Midjourney", "Lightroom"],
  },

  certifications: [
    {
      title: "Adobe After Effects Bootcamp: Basic to Advanced",
      detail:
        "Developed expertise in graphic design principles, short film production, video editing, motion graphics, and motion design, with proficiency in Adobe Creative Suite and a strong focus on attention to detail and film editing.",
    },
    {
      title: "Adobe Premiere Pro",
      detail:
        "Proficient in video editing, storytelling, color grading, and sound design using Adobe Premiere Pro for high-quality content.",
    },
  ],

  education: [
    {
      degree: "B.Tech, Information Technology",
      school: "Manipal University Jaipur",
      location: "Jaipur, Rajasthan",
    },
  ],
};

export type MasterResume = Omit<typeof masterResume, "skills"> & {
  skills: Record<string, string[]>;
};
