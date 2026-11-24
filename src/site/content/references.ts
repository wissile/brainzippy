/**
 * Research references cited on public pages. One registry so the same study is always cited the same
 * way. `url` points to the publisher, an author copy, or an official summary. Sources marked in
 * docs/REFERENCE_RESEARCH.md were read during research; the others are standard references whose
 * citation details were checked against search results on 2026-11-17 (see docs/CONTENT_QUALITY.md).
 */
export interface Reference {
  key: string;
  /** In-text citation, e.g. "Siegler & Ramani, 2008". */
  short: string;
  authors: string;
  /** Publication year, or "n.d." for an undated web page from an official source. */
  year: number | "n.d.";
  title: string;
  venue: string;
  url: string;
}

const R = (key: string, short: string, authors: string, year: number | "n.d.", title: string, venue: string, url: string): Reference => ({ key, short, authors, year, title, venue, url });

export const REFERENCES = {
  gelman1978: R("gelman1978", "Gelman & Gallistel, 1978", "Gelman, R. & Gallistel, C. R.", 1978, "The Child's Understanding of Number", "Harvard University Press", "https://www.hup.harvard.edu/books/9780674116375"),
  lecorre2007: R("lecorre2007", "Le Corre & Carey, 2007", "Le Corre, M. & Carey, S.", 2007, "One, two, three, four, nothing more: An investigation of the conceptual sources of the verbal counting principles", "Cognition, 105, 395–438", "https://doi.org/10.1016/j.cognition.2006.10.005"),
  clements1999: R("clements1999", "Clements, 1999", "Clements, D. H.", 1999, "Subitizing: What is it? Why teach it?", "Teaching Children Mathematics, 5(7), 400–405", "https://doi.org/10.5951/TCM.5.7.0400"),
  siegler2008: R("siegler2008", "Siegler & Ramani, 2008", "Siegler, R. S. & Ramani, G. B.", 2008, "Playing linear numerical board games promotes low-income children's numerical development", "Developmental Science, 11(5), 655–661", "https://pubmed.ncbi.nlm.nih.gov/18801120/"),
  siegler2004: R("siegler2004", "Siegler & Booth, 2004", "Siegler, R. S. & Booth, J. L.", 2004, "Development of numerical estimation in young children", "Child Development, 75(2), 428–444", "https://doi.org/10.1111/j.1467-8624.2004.00684.x"),
  hirshpasek2015: R("hirshpasek2015", "Hirsh-Pasek et al., 2015", "Hirsh-Pasek, K. et al.", 2015, "Putting education in “educational” apps: Lessons from the science of learning", "Psychological Science in the Public Interest, 16(1), 3–34", "https://www.psychologicalscience.org/publications/educational-apps.html"),
  fisher2014: R("fisher2014", "Fisher, Godwin & Seltman, 2014", "Fisher, A. V., Godwin, K. E. & Seltman, H.", 2014, "Visual environment, attention allocation, and learning in young children: When too much of a good thing may be bad", "Psychological Science, 25(7), 1362–1370", "https://doi.org/10.1177/0956797614533801"),
  fyfe2015: R("fyfe2015", "Fyfe & Rittle-Johnson, 2016", "Fyfe, E. R. & Rittle-Johnson, B.", 2016, "Feedback both helps and hinders learning: The causal role of prior knowledge", "Journal of Educational Psychology, 108(1), 82–97 (online 2015)", "https://news.vanderbilt.edu/files/FyfeRittleJohnson2015_JEP.pdf"),
  sweller2019: R("sweller2019", "Sweller, van Merriënboer & Paas, 2019", "Sweller, J., van Merriënboer, J. J. G. & Paas, F.", 2019, "Cognitive architecture and instructional design: 20 years later", "Educational Psychology Review, 31(2), 261–292", "https://doi.org/10.1007/s10648-019-09465-5"),
  fazio2019: R("fazio2019", "Fazio & Marsh, 2019", "Fazio, L. K. & Marsh, E. J.", 2019, "Retrieval-based learning in children", "Current Directions in Psychological Science, 28(2), 111–116", "https://doi.org/10.1177/0963721418806673"),
  vlach2012: R("vlach2012", "Vlach & Sandhofer, 2012", "Vlach, H. A. & Sandhofer, C. M.", 2012, "Distributing learning over time: The spacing effect in children's acquisition and generalization of science concepts", "Child Development, 83(4), 1137–1144", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3399982"),
  cepeda2006: R("cepeda2006", "Cepeda et al., 2006", "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T. & Rohrer, D.", 2006, "Distributed practice in verbal recall tasks: A review and quantitative synthesis", "Psychological Bulletin, 132(3), 354–380", "https://doi.org/10.1037/0033-2909.132.3.354"),
  cimpian2007: R("cimpian2007", "Cimpian et al., 2007", "Cimpian, A., Arce, H. C., Markman, E. M. & Dweck, C. S.", 2007, "Subtle linguistic cues affect children's motivation", "Psychological Science, 18(4), 314–316", "https://doi.org/10.1111/j.1467-9280.2007.01896.x"),
  macnamara2023: R("macnamara2023", "Macnamara & Burgoyne, 2023", "Macnamara, B. N. & Burgoyne, A. P.", 2023, "Do growth mindset interventions impact students' academic achievement? A systematic review and meta-analysis", "Psychological Bulletin, 149(3–4), 133–173", "https://doi.org/10.1037/bul0000352"),
  deci1999: R("deci1999", "Deci, Koestner & Ryan, 1999", "Deci, E. L., Koestner, R. & Ryan, R. M.", 1999, "A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation", "Psychological Bulletin, 125(6), 627–668", "https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf"),
  meyer2019: R("meyer2019", "Meyer et al., 2019", "Meyer, M., Adkins, V., Yuan, N., Weeks, H. M., Chang, Y.-J. & Radesky, J.", 2019, "Advertising in young children's apps: A content analysis", "Journal of Developmental & Behavioral Pediatrics, 40(1), 32–39", "https://doi.org/10.1097/DBP.0000000000000622"),
  frydman1988: R("frydman1988", "Frydman & Bryant, 1988", "Frydman, O. & Bryant, P.", 1988, "Sharing and the understanding of number equivalence by young children", "Cognitive Development, 3(4), 323–339", "https://www.sciencedirect.com/journal/cognitive-development/vol/3/issue/4"),
  lally2010: R("lally2010", "Lally et al., 2010", "Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W. & Wardle, J.", 2010, "How are habits formed: Modelling habit formation in the real world", "European Journal of Social Psychology, 40(6), 998–1009", "https://doi.org/10.1002/ejsp.674"),
  aap2016: R("aap2016", "American Academy of Pediatrics, 2016", "American Academy of Pediatrics, Council on Communications and Media", 2016, "Media and young minds", "Pediatrics, 138(5), e20162591", "https://doi.org/10.1542/peds.2016-2591"),
  who2019: R("who2019", "World Health Organization, 2019", "World Health Organization", 2019, "Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age", "WHO", "https://www.ncbi.nlm.nih.gov/books/NBK541173/"),
  foorman2016: R("foorman2016", "Foorman et al., 2016", "Foorman, B. et al.", 2016, "Foundational skills to support reading for understanding in kindergarten through 3rd grade (NCEE 2016-4008)", "Institute of Education Sciences, What Works Clearinghouse", "https://ies.ed.gov/ncee/wwc/PracticeGuide/21"),
  bradley1983: R("bradley1983", "Bradley & Bryant, 1983", "Bradley, L. & Bryant, P. E.", 1983, "Categorizing sounds and learning to read: A causal connection", "Nature, 301, 419–421", "https://doi.org/10.1038/301419a0"),
  clements1999shape: R("clements1999shape", "Clements et al., 1999", "Clements, D. H., Swaminathan, S., Hannibal, M. A. Z. & Sarama, J.", 1999, "Young children's concepts of shape", "Journal for Research in Mathematics Education, 30(2), 192–212", "https://www.nctm.org/Publications/Journal-for-Research-in-Mathematics-Education/1999/Vol30/Issue2/Young-Children_s-Concepts-of-Shape/"),
  rittlejohnson2017: R("rittlejohnson2017", "Rittle-Johnson et al., 2017", "Rittle-Johnson, B., Fyfe, E. R., Hofer, K. G. & Farran, D. C.", 2017, "Early math trajectories: Low-income children's mathematics knowledge from ages 4 to 11", "Child Development, 88(5), 1727–1742", "https://doi.org/10.1111/cdev.12662"),
  knuth2006: R("knuth2006", "Knuth et al., 2006", "Knuth, E. J., Stephens, A. C., McNeil, N. M. & Alibali, M. W.", 2006, "Does understanding the equal sign matter? Evidence from solving equations", "Journal for Research in Mathematics Education, 37(4), 297–312", "https://alibali.psych.wisc.edu/wp-content/uploads/sites/371/2018/02/KnuthStephensMcNeilAlibali2006.pdf"),
  siegler2010: R("siegler2010", "Siegler et al., 2010", "Siegler, R., Carpenter, T., Fennell, F., Geary, D., Lewis, J., Okamoto, Y., Thompson, L. & Wray, J.", 2010, "Developing effective fractions instruction for kindergarten through 8th grade: A practice guide (NCEE 2010-4039)", "Institute of Education Sciences, What Works Clearinghouse", "https://ies.ed.gov/ncee/wwc/PracticeGuide/15"),
  kamil2008: R("kamil2008", "Kamil et al., 2008", "Kamil, M. L., Borman, G. D., Dole, J., Kral, C. C., Salinger, T. & Torgesen, J.", 2008, "Improving adolescent literacy: Effective classroom and intervention practices (NCEE 2008-4027)", "Institute of Education Sciences, What Works Clearinghouse", "https://ies.ed.gov/ncee/wwc/PracticeGuide/8"),
  ccssela: R("ccssela", "Common Core State Standards for English Language Arts, 2010", "National Governors Association Center for Best Practices & Council of Chief State School Officers", 2010, "Common Core State Standards for English Language Arts & Literacy in History/Social Studies, Science, and Technical Subjects", "NGA Center & CCSSO", "https://www.thecorestandards.org/ELA-Literacy/"),
  ccss: R("ccss", "Common Core State Standards, 2010", "National Governors Association Center for Best Practices & Council of Chief State School Officers", 2010, "Common Core State Standards for Mathematics", "NGA Center & CCSSO", "https://www.thecorestandards.org/Math/"),
  // Library frameworks (docs/curriculum/README.md §5). We say "aligned with"; none of these bodies has reviewed BrainZippy.
  csta2017: R("csta2017", "CSTA, 2017", "Computer Science Teachers Association", 2017, "CSTA K-12 Computer Science Standards, revised 2017", "Computer Science Teachers Association", "https://portal.ct.gov/-/media/sde/cte/csta-k12-computer-science-standards-revised-2017.pdf"),
  ngss2013: R("ngss2013", "NGSS Lead States, 2013", "NGSS Lead States", 2013, "Next Generation Science Standards: For States, By States", "The National Academies Press", "https://www.nextgenscience.org/"),
  nspfe2021: R("nspfe2021", "Council for Economic Education & Jump$tart, 2021", "Council for Economic Education & Jump$tart Coalition for Personal Financial Literacy", 2021, "National Standards for Personal Financial Education", "Council for Economic Education & Jump$tart Coalition", "https://www.ksde.gov/Portals/0/CSAS/CSAS%20Home/Financial%20Literacy/2021%20National%20Standards%20for%20Personal%20Financial%20Education.pdf"),
  cfpb2016: R("cfpb2016", "CFPB, 2016", "Consumer Financial Protection Bureau", 2016, "Building blocks to help youth achieve financial capability: A new model and recommendations", "Consumer Financial Protection Bureau", "https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/learn/"),
  ncge2012: R("ncge2012", "NCGE, 2012", "Heffron, S. G. & Downs, R. M. (Eds.)", 2012, "Geography for Life: National Geography Standards, second edition", "National Council for Geographic Education", "https://ncge.org/resources/national-geography-standards"),
  casel: R("casel", "CASEL, n.d.", "Collaborative for Academic, Social, and Emotional Learning", "n.d.", "What is the CASEL framework?", "CASEL", "https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/"),
  faa2023: R("faa2023", "FAA, 2023", "Federal Aviation Administration", 2023, "Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C)", "U.S. Department of Transportation, Federal Aviation Administration", "https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak"),
  cisa2024: R("cisa2024", "CISA, 2024", "Cybersecurity and Infrastructure Security Agency", 2024, "Secure Our World: Recognize and report phishing", "CISA", "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing"),
  ftc2025: R("ftc2025", "FTC, 2025", "Federal Trade Commission, Consumer Advice", 2025, "Protect yourself from phishing scams", "FTC consumer alert", "https://consumer.ftc.gov/consumer-alerts/2025/04/protect-yourself-phishing-scams"),
  noaa: R("noaa", "NOAA Ocean Service, n.d.", "National Oceanic and Atmospheric Administration, National Ocean Service", "n.d.", "What is coral bleaching?", "NOAA Ocean Facts", "https://oceanservice.noaa.gov/facts/coral_bleach.html"),
  // Research for the new libraries (authors, year and venue checked by web search on 2026-11-22).
  bers2014: R("bers2014", "Bers et al., 2014", "Bers, M. U., Flannery, L., Kazakoff, E. R. & Sullivan, A.", 2014, "Computational thinking and tinkering: Exploration of an early childhood robotics curriculum", "Computers & Education, 72, 145–157", "https://sites.bc.edu/devtech/wp-content/uploads/sites/181/2018/02/computersandeducation.pdf"),
  barrett2019: R("barrett2019", "Barrett et al., 2019", "Barrett, L. F., Adolphs, R., Marsella, S., Martinez, A. M. & Pollak, S. D.", 2019, "Emotional expressions reconsidered: Challenges to inferring emotion from human facial movements", "Psychological Science in the Public Interest, 20(1), 1–68", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6640856"),
} satisfies Record<string, Reference>;

export type RefKey = keyof typeof REFERENCES;

export const cite = (k: RefKey) => REFERENCES[k].short;
