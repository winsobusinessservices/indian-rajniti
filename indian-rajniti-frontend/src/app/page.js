import Link from "next/link";
import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroNews from "@/components/news/HeroNews";
import NewsCard from "@/components/news/NewsCard";
import TrendingNews from "@/components/news/TrendingNews";
import PoliticianCard from "@/components/politician/PoliticianCard";
import CMCard from "@/components/politician/CMCard";
import PartyCard from "@/components/politician/PartyCard";
import ImagePlaceholder from "@/components/common/ImagePlaceholder";
import AdSlot from "@/components/common/AdSlot";
import { slugify } from "@/lib/slugify";

import {
  getBreakingNews,
  getHeroSlides,
  getTopStories,
  getEditorialOpinion,
  getRegionalFocus,
  getInDepthAnalysis,
  getMultimediaHub,
  getPressConferenceArchive,
  getVideoHighlights,
  getXFeed,
  getFacebookUpdates,
  getTrending,
  getDigitalPulse,
  getTheBriefing,
  getElectionResults,
  getPopularTags,
  getExtraKeywords,
  getLegislativeTracker,
  getPoliticalKeywords,
  getPartyPulse,
  getConstituencySpotlight,
  getPmCorner,
  getPoliticalCalendar,
  getFromTheArchives,
  getFactCheck,
  getPollOfTheDay,
  getRtiCorner,
  getFollowUs,
  getBlogs,
} from "@/features/news/news.api";
import {
  getKeyFigures,
  getFormerPMs,
  getChiefMinisters,
  getVoicesOfNation,
  getOpinionLeaders,
  getParties,
} from "@/features/politicians/politician.api";
import { getParliamentSummary } from "@/features/parliament/parliament.api";
import { getStates, getUnionTerritories } from "@/features/geography/geography.api";

function SectionHeader({ title, viewAllHref }) {
  return (
    <div className="flex items-center justify-between mb-6 border-b border-outline-variant/30 pb-2">
      <h2 className="font-display-lg text-2xl md:text-3xl text-primary tracking-tight">{title}</h2>
      {viewAllHref && (
        <a href={viewAllHref} className="font-label-md text-secondary hover:underline flex items-center gap-1 text-sm">
          VIEW ALL <i className="fa-solid fa-arrow-right text-xs" />
        </a>
      )}
    </div>
  );
}

// Sidebar keyword pill group — every href resolves through the same
// /category/[slug] registry the footer and other sidebars already use.
function KeywordTagGroup({ title, icon, tags }) {
  return (
    <div className="pt-4 border-t border-outline-variant/30">
      <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
        <h3 className="font-headline-md text-primary tracking-tight text-lg">{title}</h3>
        <i className={`${icon} text-secondary text-lg`} />
      </div>
      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/category/${slugify(tag)}`}
            className="px-2 py-1 bg-surface-container-high text-on-surface font-bold text-xs rounded-sm border border-outline-variant/20 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const [
    breakingNews,
    heroSlides,
    topStories,
    editorialOpinion,
    regionalFocus,
    inDepthAnalysis,
    multimediaHub,
    pressConference,
    videoHighlights,
    xFeed,
    facebookUpdates,
    trending,
    digitalPulse,
    theBriefing,
    electionResults,
    popularTags,
    extraKeywords,
    legislativeTracker,
    politicalKeywords,
    partyPulse,
    constituencySpotlight,
    pmCorner,
    keyFigures,
    formerPMs,
    chiefMinisters,
    voicesOfNation,
    opinionLeaders,
    politicalCalendar,
    fromTheArchives,
    factCheck,
    pollOfTheDay,
    rtiCorner,
    followUs,
    blogs,
    parties,
    parliamentSummary,
    states,
    unionTerritories,
  ] = await Promise.all([
    getBreakingNews(),
    getHeroSlides(),
    getTopStories(),
    getEditorialOpinion(),
    getRegionalFocus(),
    getInDepthAnalysis(),
    getMultimediaHub(),
    getPressConferenceArchive(),
    getVideoHighlights(),
    getXFeed(),
    getFacebookUpdates(),
    getTrending(),
    getDigitalPulse(),
    getTheBriefing(),
    getElectionResults(),
    getPopularTags(),
    getExtraKeywords(),
    getLegislativeTracker(),
    getPoliticalKeywords(),
    getPartyPulse(),
    getConstituencySpotlight(),
    getPmCorner(),
    getKeyFigures(),
    getFormerPMs(),
    getChiefMinisters(),
    getVoicesOfNation(),
    getOpinionLeaders(),
    getPoliticalCalendar(),
    getFromTheArchives(),
    getFactCheck(),
    getPollOfTheDay(),
    getRtiCorner(),
    getFollowUs(),
    getBlogs(),
    getParties(),
    getParliamentSummary(),
    getStates(),
    getUnionTerritories(),
  ]);

  return (
    <>
      <BreakingNews text={breakingNews} />
      <Header />

      <main className="w-full bg-background flex-grow">
        <div className="max-w-full mx-auto px-4 md:px-16 flex flex-col lg:flex-row gap-6 py-6">
          <HeroNews slides={heroSlides} />
        </div>

        <div className="max-w-full mx-auto px-4 md:px-16 flex flex-col lg:flex-row gap-6 py-6">
          {/* Main column */}
          <div className="flex-grow flex flex-col gap-6 lg:w-2/3">

            {/* Top Stories */}
            <section>
              <SectionHeader title="Top Stories" viewAllHref="/top-news" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topStories.map((story) => (
                  <NewsCard key={story.id} variant="stacked" story={story} />
                ))}
              </div>
            </section>

            {/* Editorial Opinion */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Editorial Opinion" viewAllHref="#" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editorialOpinion.map((story) => (
                  <NewsCard key={story.id} variant="horizontal" story={story} />
                ))}
              </div>
            </section>

            {/* Latest Blogs */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Latest Blogs" viewAllHref="/blogs" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {blogs.slice(0, 3).map((blog) => (
                  <NewsCard key={blog.id} variant="stacked" story={blog} />
                ))}
              </div>
            </section>

            {/* Regional Focus */}
            <section className="border-t border-outline-variant/30 pt-6">
              <div className="flex items-center justify-between mb-6 border-b border-outline-variant/30 pb-2 flex-wrap gap-3">
                <h2 className="font-display-lg text-2xl md:text-3xl text-primary tracking-tight">Regional Focus</h2>
                <div className="flex gap-2">
                  {regionalFocus.states.map((state, index) => (
                    <Link
                      key={state}
                      href={`/category/${slugify(state)}`}
                      className={
                        index === 0
                          ? "px-3 py-1 bg-primary text-on-primary text-xs rounded-sm font-label-sm"
                          : "px-3 py-1 bg-surface border border-outline-variant/50 text-on-surface text-xs rounded-sm hover:bg-surface-variant transition-colors font-label-sm"
                      }
                    >
                      {state}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {regionalFocus.stories.map((story) => (
                  <NewsCard key={story.id} variant="compact" story={story} />
                ))}
              </div>
            </section>

            {/* In-Depth Analysis */}
            {inDepthAnalysis && (
              <section className="border-t border-outline-variant/30 pt-6">
                <SectionHeader title="In-Depth Analysis" />
                <article className="group flex flex-col md:flex-row gap-6 cursor-pointer">
                  <ImagePlaceholder
                    icon={inDepthAnalysis.icon}
                    image={inDepthAnalysis.image}
                    alt={inDepthAnalysis.title}
                    gradient="primary"
                    className="w-full md:w-1/2 aspect-video rounded-lg"
                    iconClassName="text-5xl"
                  />
                  <div className="w-full md:w-1/2 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-error uppercase tracking-wider mb-2">
                      {inDepthAnalysis.tag}
                    </span>
                    <h3 className="font-display-lg text-xl md:text-2xl text-on-surface group-hover:text-primary transition-colors leading-tight mb-3">
                      {inDepthAnalysis.title}
                    </h3>
                    <p className="font-body-md text-on-surface-variant text-sm mb-4">{inDepthAnalysis.excerpt}</p>
                    <Link href={`/news/${inDepthAnalysis.slug}`} className="font-label-sm text-primary hover:underline flex items-center gap-1">
                      READ FULL REPORT <i className="fa-solid fa-arrow-right text-xs" />
                    </Link>
                  </div>
                </article>
              </section>
            )}

            {/* Multimedia Hub */}
            <section className="bg-inverse-surface text-inverse-on-surface py-6 rounded-xl px-6">
              <div className="flex items-center justify-between mb-6 border-b border-white/20 pb-2">
                <h2 className="font-display-lg text-2xl md:text-3xl tracking-tight text-white">Multimedia Hub</h2>
                <Link href="/videos" className="font-label-md text-inverse-primary hover:underline flex items-center gap-1 text-sm">
                  MORE VIDEOS <i className="fa-solid fa-arrow-right text-xs" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {multimediaHub.map((video) => (
                  <div key={video.id} className="group cursor-pointer">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3">
                      <ImagePlaceholder icon="fa-solid fa-video" image={video.image} alt={video.title} gradient="inverse" className="w-full h-full" iconClassName="text-4xl" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <i className="fa-solid fa-circle-play text-white text-5xl opacity-90 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <h3 className="font-headline-md text-lg text-white group-hover:text-inverse-primary transition-colors leading-snug">
                      {video.title}
                    </h3>
                  </div>
                ))}
              </div>
            </section>

            {/* Ad banner */}
            <div className="w-full flex flex-col items-center border-y border-outline-variant/30 py-4">
              <AdSlot width="728px" height="90px" label="728x90 Leaderboard Ad" orientation="horizontal" />
            </div>

            {/* Key Political Figures */}
            <section>
              <SectionHeader title="Key Political Figures" viewAllHref="/key-political-figures" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {keyFigures.map((figure) => (
                  <PoliticianCard key={figure.id} name={figure.name} subtitle={figure.position} photo={figure.photo} href={`/category/${slugify(figure.name)}`} />
                )).slice(0, 5)}
              </div>
            </section>

            {/* Former Prime Ministers */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Former Prime Ministers" viewAllHref="/former-prime-ministers" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {formerPMs.map((pm) => (
                  <CMCard key={pm.id} name={pm.name} subtitle={pm.tenure} photo={pm.photo} href={`/category/${slugify(pm.name)}`} />
                )).slice(0, 5)}
              </div>
            </section>

            {/* Voices of the Nation */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Voices of the Nation" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {voicesOfNation.map((voice) => (
                  <div key={voice.id} className="bg-surface p-6 rounded-lg border border-outline-variant/20 relative">
                    <i className="fa-solid fa-quote-left absolute top-4 left-4 text-3xl text-outline-variant/30" />
                    <p className="font-headline-md text-lg text-on-surface mb-4 relative z-10 pl-6 italic">
                      &ldquo;{voice.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center">
                        <i className="fa-solid fa-user text-sm" />
                      </span>
                      <span className="font-label-md text-sm text-on-surface-variant">{voice.attribution}</span>
                    </div>
                  </div>
                )).slice(0, 2)}
              </div>
            </section>

            {/* State Leadership */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="State Leadership" viewAllHref="/cm" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {chiefMinisters.map((cm) => (
                  <CMCard key={cm.id} name={cm.name} subtitle={`Chief Minister, ${cm.state}`} photo={cm.photo} href={`/category/${slugify(cm.name)}`} />
                )).slice(0, 5)}
              </div>
            </section>

            {/* Indian Political Parties */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Indian Political Parties" viewAllHref="/parties" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {parties.slice(0, 5).map((party) => (
                  <PartyCard key={party.id} name={party.name} abbreviation={party.abbreviation} founded={party.founded} photo={party.photo} />
                ))}
              </div>
            </section>

            {/* Parliament */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Parliament" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {parliamentSummary.map((house) => (
                  <Link
                    key={house.key}
                    href={house.href}
                    className="group flex flex-col bg-surface-container-low rounded-lg border border-outline-variant/20 hover:shadow-md transition-all p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-headline-lg text-xl text-on-surface group-hover:text-primary transition-colors">
                        {house.label}
                      </h3>
                      <span className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-landmark" />
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <span className="block font-label-md text-[10px] text-on-surface-variant uppercase tracking-wide">
                          Total Seats
                        </span>
                        <span className="font-headline-md text-lg text-primary">{house.totalSeats}</span>
                      </div>
                      <div>
                        <span className="block font-label-md text-[10px] text-on-surface-variant uppercase tracking-wide">
                          Leading Bloc
                        </span>
                        <span className="font-headline-md text-lg text-on-surface">
                          {house.leadingParty} ({house.leadingSeats})
                        </span>
                      </div>
                    </div>
                    <p className="font-body-md text-xs text-on-surface-variant mb-4">
                      {house.presidingOfficer.role}: <span className="text-on-surface">{house.presidingOfficer.name}</span>
                    </p>
                    <span className="mt-auto font-label-sm text-primary flex items-center gap-1 text-sm">
                      VIEW DETAILS <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Digital Dispatches */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Digital Dispatches" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Video Highlights */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-headline-md text-base text-secondary border-l-4 border-secondary pl-3">
                    Video Highlights
                  </h3>
                  {videoHighlights.map((video) => (
                    <div key={video.id} className="bg-surface rounded-lg overflow-hidden border border-outline-variant/20 group cursor-pointer">
                      <div className="relative aspect-video">
                        <ImagePlaceholder icon="fa-solid fa-video" image={video.image} alt={video.title} gradient="secondary" className="w-full h-full" iconClassName="text-3xl" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <i className="fa-solid fa-circle-play text-white text-4xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-body-md font-semibold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h4>
                      </div>
                    </div>
                  )).slice(0, 2)}
                </div>

                {/* X Feed */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-headline-md text-base text-primary border-l-4 border-primary pl-3">X Feed</h3>
                  {xFeed.map((post) => (
                    <div key={post.id} className="bg-surface p-3 rounded-lg border border-outline-variant/20 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                          <i className="fa-solid fa-user text-sm" />
                        </div>
                        <div>
                          <p className="font-label-md text-on-surface font-bold flex items-center gap-1 text-sm">
                            {post.name}
                            {post.verified && <i className="fa-solid fa-circle-check text-[12px] text-surface-tint" />}
                          </p>
                          <p className="font-label-sm text-outline text-[10px]">{post.handle}</p>
                        </div>
                      </div>
                      <p className="font-body-md text-on-surface-variant text-xs">{post.text}</p>
                      {post.hasImage && (
                        <ImagePlaceholder icon="fa-solid fa-image" image={post.image} gradient="tint" className="w-full h-24 rounded-md" />
                      )}
                      <div className="flex items-center justify-between text-outline mt-1 pt-2 border-t border-outline-variant/20">
                        <span className="flex items-center gap-1 text-[10px]">
                          <i className="fa-regular fa-comment" /> {post.stats.comments}
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <i className="fa-solid fa-retweet" /> {post.stats.retweets}
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <i className="fa-solid fa-heart" /> {post.stats.likes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Facebook Updates */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-headline-md text-base text-surface-tint border-l-4 border-surface-tint pl-3">
                    Facebook Updates
                  </h3>
                  {facebookUpdates.map((post) => (
                    <div key={post.id} className="bg-surface p-3 rounded-lg border border-outline-variant/20 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                          <i className="fa-solid fa-people-group text-sm" />
                        </div>
                        <div>
                          <p className="font-label-md text-on-surface font-bold text-sm">{post.name}</p>
                          <p className="font-label-sm text-outline text-[10px]">{post.time}</p>
                        </div>
                      </div>
                      <p className="font-body-md text-on-surface-variant text-xs">{post.text}</p>
                      {post.hasImage && (
                        <ImagePlaceholder icon="fa-solid fa-image" image={post.image} gradient="primary" className="w-full aspect-[4/3] rounded-md" />
                      )}
                      <div className="flex items-center justify-between text-outline mt-1 pt-2 border-t border-outline-variant/20">
                        <span className="flex items-center gap-1 text-xs font-label-md">
                          <i className="fa-regular fa-thumbs-up" /> Like
                        </span>
                        <span className="flex items-center gap-1 text-xs font-label-md">
                          <i className="fa-regular fa-comment" /> Comment
                        </span>
                        <span className="flex items-center gap-1 text-xs font-label-md">
                          <i className="fa-solid fa-share" /> Share
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Prime Minister's Corner */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Prime Minister's Corner" />
              <article className="group flex flex-col md:flex-row gap-8">
                <ImagePlaceholder
                  icon="fa-solid fa-user-tie"
                  image={pmCorner.image}
                  alt={pmCorner.name}
                  gradient="primary"
                  className="w-full md:w-1/2 aspect-square rounded-lg"
                  iconClassName="text-6xl"
                />
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">
                    {pmCorner.tag}
                  </span>
                  <h3 className="font-display-lg text-2xl md:text-3xl text-on-surface mb-4">{pmCorner.name}</h3>
                  <p className="font-body-md text-on-surface-variant text-sm mb-6 italic">&ldquo;{pmCorner.quote}&rdquo;</p>
                  <div className="space-y-4">
                    {pmCorner.initiatives.map((initiative) => (
                      <div key={initiative.title} className="border-l-4 border-primary pl-4">
                        <h4 className="font-headline-md text-sm text-primary">{initiative.title}</h4>
                        <p className="text-xs text-on-surface-variant">{initiative.excerpt}</p>
                      </div>
                    ))}
                  </div>
                  <Link href="/speeches" className="mt-8 font-label-sm text-primary hover:underline flex items-center gap-1">
                    VIEW ALL SPEECHES <i className="fa-solid fa-arrow-right text-xs" />
                  </Link>
                </div>
              </article>
            </section>

            {/* Press Conference Archive */}
            <section className="border-t border-outline-variant/30 pt-6">
              <SectionHeader title="Press Conference Archive" viewAllHref="/press-conferences" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {pressConference.map((item) => (
                  <div key={item.id} className="group cursor-pointer">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3">
                      <ImagePlaceholder icon="fa-solid fa-microphone" image={item.image} alt={item.title} gradient="secondary" className="w-full h-full" iconClassName="text-3xl" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <i className="fa-solid fa-circle-play text-white text-4xl opacity-90 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <h3 className="font-headline-md text-sm text-on-surface group-hover:text-primary transition-colors leading-snug">
                      {item.title}
                    </h3>
                  </div>
                )).slice(0, 4)}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/4 h-full flex flex-col bg-surface-container rounded-xl p-4 border border-outline-variant/30 gap-6">
            <TrendingNews items={trending} viewAllHref="/trending" />

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Poll of the Day</h3>
                <i className="fa-solid fa-square-poll-vertical text-secondary text-lg" />
              </div>
              <p className="font-body-md text-sm text-on-surface mb-3">{pollOfTheDay.question}</p>
              <div className="space-y-2">
                {pollOfTheDay.options.map((option) => (
                  <div key={option.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-label-md text-on-surface-variant">{option.label}</span>
                      <span className="font-label-md text-primary font-bold">{option.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${option.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-outline text-[10px] mt-3">{pollOfTheDay.totalVotes} votes cast</p>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Legislative Tracker</h3>
                <i className="fa-solid fa-file-lines text-secondary text-lg" />
              </div>
              <ul className="space-y-4">
                {legislativeTracker.map((bill) => (
                  <li key={bill.id} className="group cursor-pointer">
                    <h4 className="font-body-md font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                      {bill.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${bill.statusClass}`}>
                        {bill.status}
                      </span>
                      <span className="text-outline text-xs">{bill.stage}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Parliament Strength</h3>
                <i className="fa-solid fa-landmark text-secondary text-lg" />
              </div>
              <div className="flex flex-col gap-3">
                {parliamentSummary.map((house, index) => (
                  <Link
                    key={house.key}
                    href={house.href}
                    className={`group block ${index > 0 ? "border-t border-outline-variant/20 pt-3" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-headline-md text-sm text-on-surface group-hover:text-primary transition-colors">
                        {house.label}
                      </h4>
                      <span className="text-[10px] font-label-md text-on-surface-variant">{house.totalSeats} seats</span>
                    </div>
                    <p className="font-body-md text-xs text-on-surface-variant">
                      Leading bloc: {house.leadingParty} ({house.leadingSeats} seats)
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Political Calendar</h3>
                <i className="fa-solid fa-calendar-days text-secondary text-lg" />
              </div>
              <ul className="space-y-3">
                {politicalCalendar.map((event) => (
                  <li key={event.id} className="flex gap-3 group cursor-pointer">
                    <span className="font-label-md text-xs text-primary bg-primary-fixed px-2 py-1 rounded-sm flex-shrink-0 h-fit">
                      {event.date}
                    </span>
                    <p className="font-body-md text-sm text-on-surface group-hover:text-primary transition-colors">
                      {event.title}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">RTI Corner</h3>
                <i className="fa-solid fa-file-circle-question text-secondary text-lg" />
              </div>
              <ul className="space-y-3">
                {rtiCorner.map((item) => (
                  <li key={item.id} className="group cursor-pointer">
                    <p className="font-body-md text-sm text-on-surface group-hover:text-primary transition-colors leading-snug">
                      {item.title}
                    </p>
                    <span className="text-outline text-[10px]">{item.date}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Digital Pulse</h3>
                <i className="fa-solid fa-bolt text-secondary text-lg" />
              </div>
              <div className="flex flex-col gap-3">
                {digitalPulse.map((item, index) => (
                  <div key={item.id} className={index > 0 ? "border-t border-outline-variant/20 pt-3" : ""}>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm inline-block mb-1 uppercase tracking-widest ${item.tagClass}`}>
                      {item.tag}
                    </span>
                    <p className="font-body-md text-sm text-on-surface">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Opinion Leaders</h3>
              </div>
              <div className="flex flex-col gap-4">
                {opinionLeaders.map((leader) => (
                  <div key={leader.id} className="flex gap-3 items-center group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-feather-pointed text-white text-xs" />
                    </div>
                    <h4 className="font-headline-md text-xs text-on-surface group-hover:text-primary transition-colors italic leading-tight">
                      &ldquo;{leader.quote}&rdquo;
                    </h4>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Party Pulse</h3>
                <i className="fa-solid fa-people-group text-secondary text-lg" />
              </div>
              <div className="group cursor-pointer">
                <h4 className="font-body-md font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                  {partyPulse.title}
                </h4>
                <p className="font-body-md text-xs text-on-surface-variant line-clamp-2">{partyPulse.excerpt}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Fact Check</h3>
                <i className="fa-solid fa-magnifying-glass text-secondary text-lg" />
              </div>
              <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
                <p className="font-body-md text-sm text-on-surface mb-2">{factCheck.claim}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase inline-block mb-2 ${factCheck.verdictClass}`}>
                  {factCheck.verdict}
                </span>
                <p className="font-body-md text-xs text-on-surface-variant">{factCheck.explanation}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">The Briefing</h3>
              </div>
              <ul className="space-y-2">
                {theBriefing.map((item) => (
                  <li key={item} className="flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                    <p className="font-body-md text-xs text-on-surface-variant">{item}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">From the Archives</h3>
                <i className="fa-solid fa-landmark-flag text-secondary text-lg" />
              </div>
              <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20">
                <h4 className="font-headline-md text-sm text-primary mb-1">{fromTheArchives.title}</h4>
                <p className="font-body-md text-xs text-on-surface-variant">{fromTheArchives.note}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Election Results</h3>
              </div>
              <div className="bg-surface-container-low rounded p-2 border border-outline-variant/20">
                <table className="w-full text-[10px] font-label-md">
                  <thead>
                    <tr className="text-outline border-b border-outline-variant/30">
                      <th className="text-left py-1">STATE</th>
                      <th className="text-right py-1">PARTY</th>
                      <th className="text-right py-1">SEATS</th>
                    </tr>
                  </thead>
                  <tbody className="text-on-surface">
                    {electionResults.map((row, index) => (
                      <tr key={row.id} className={index < electionResults.length - 1 ? "border-b border-outline-variant/10" : ""}>
                        <td className="py-1.5">{row.state}</td>
                        <td className="text-right py-1.5">{row.party}</td>
                        <td className={`text-right py-1.5 ${row.change.startsWith('+') ? "text-green-600" : "text-error"}`}>{row.seats}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30 flex flex-col items-center">
              <AdSlot width="300px" height="250px" label="300x250 Rectangle Ad" />
            </div>

            <KeywordTagGroup
              title="Political Keywords"
              icon="fa-solid fa-tag"
              tags={[...politicalKeywords.parties, ...politicalKeywords.states, ...politicalKeywords.categories]}
            />

            <KeywordTagGroup title="States" icon="fa-solid fa-map" tags={states.map((s) => s.name)} />

            <KeywordTagGroup
              title="Union Territories"
              icon="fa-solid fa-map-pin"
              tags={unionTerritories.map((ut) => ut.name)}
            />

            <KeywordTagGroup
              title="Elections by State"
              icon="fa-solid fa-box-ballot"
              tags={[...states, ...unionTerritories].map((place) => `Election in ${place.name}`)}
            />

            <KeywordTagGroup title="Political Parties" icon="fa-solid fa-people-group" tags={parties.map((p) => p.abbreviation)} />

            <KeywordTagGroup title="Categories" icon="fa-solid fa-list" tags={extraKeywords} />

            <div className="pt-4 border-t border-outline-variant/30">
              <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                <h3 className="font-headline-md text-primary tracking-tight text-lg">Constituency Spotlight</h3>
                <i className="fa-solid fa-location-dot text-secondary text-lg" />
              </div>
              <div className="bg-surface-container-low p-3 rounded border border-outline-variant/20 group cursor-pointer">
                <h4 className="font-headline-md text-sm text-on-surface group-hover:text-primary transition-colors">
                  {constituencySpotlight.title}
                </h4>
                <p className="font-body-md text-xs text-on-surface-variant mt-1">{constituencySpotlight.excerpt}</p>
              </div>
            </div>

           
          </aside>
        </div>
      </main>

      {/* Popular Tags */}
      <section className="w-full bg-surface py-6 border-t border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-4 md:px-16">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="font-label-md text-primary tracking-widest uppercase text-xs">Popular Tags</h2>
            <div className="h-px flex-grow bg-outline-variant/30" />
          </div>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Link
                key={tag}
                href={`/category/${slugify(tag)}`}
                className="px-2 py-1 border border-outline-variant/50 rounded-sm text-[10px] font-label-md text-on-surface-variant hover:border-primary hover:text-primary transition-all uppercase tracking-wider"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
