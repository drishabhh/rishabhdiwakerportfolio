import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Svg,
  Path,
  Circle,
} from "@react-pdf/renderer";
import type { MasterResume } from "@/lib/resumeData";
import {
  getFieldFormat,
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  DEFAULT_PAGE_DESIGN,
  type PageDesign,
  type ResumeEditorExtras,
  type ResumeSectionId,
} from "@/lib/resume-editor-state";
import { splitBoldSpans } from "@/lib/resume-bold-spans";
import { applyPdfFieldFormat } from "@/lib/field-format-style";
import {
  REFERENCE_RESUME_LAYOUT,
  layoutWithBakedContentScale,
  type ResumeLayout,
} from "@/lib/resume-layout-reference";
import { filterNonemptyCertifications, filterNonemptyEducation } from "@/lib/resume-preserve";
import {
  computeResumeContentScale,
  layoutForFitMeasurement,
  PAGE_CONTENT_HEIGHT_PT,
  SECTION_GAP_PT,
} from "@/lib/resume-page-fit";

const PURPLE = DEFAULT_PAGE_DESIGN.accentColor;
const TEXT = DEFAULT_PAGE_DESIGN.textColor;
const MUTED = DEFAULT_PAGE_DESIGN.mutedColor;

function buildStyles(layout: ResumeLayout, design: PageDesign) {
  const body = layout.bodyFontSize * layout.spacingScale;
  const heading = layout.sectionHeadingFontSize * layout.spacingScale;
  const accent = design.accentColor;
  const text = design.textColor;
  const muted = design.mutedColor;

  return StyleSheet.create({
    page: {
      height: A4_HEIGHT_PT,
      width: A4_WIDTH_PT,
      paddingTop: layout.pagePaddingTop,
      paddingBottom: layout.pagePaddingBottom,
      paddingHorizontal: layout.pagePaddingHorizontal,
      flexDirection: "column",
      fontSize: body,
      color: text,
      fontFamily: "Helvetica",
      backgroundColor: design.pageBackgroundColor,
      overflow: "hidden",
    },
    contentClip: {
      flex: 1,
      overflow: "hidden",
      maxHeight: PAGE_CONTENT_HEIGHT_PT,
      width: "100%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerLeft: { flex: 1, paddingRight: scale(14, layout) },
    name: {
      fontSize: layout.nameFontSize * layout.spacingScale,
      fontWeight: 700,
      color: accent,
      marginBottom: scale(3, layout),
    },
    title: {
      fontSize: layout.titleFontSize * layout.spacingScale,
      fontWeight: 700,
      lineHeight: 1.28,
      marginBottom: scale(7, layout),
      maxWidth: 400,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: scale(10, layout),
    },
    contactItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      fontSize: body,
      color: accent,
    },
    contactPhone: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      fontSize: body,
      color: text,
    },
    photoWrap: {
      width: layout.photoSize,
      height: layout.photoSize,
      borderRadius: (layout.photoSize * design.photoBorderRadius) / 100,
      overflow: "hidden",
    },
    photo: {
      objectFit: "cover",
    },
    main: { flex: 1, marginTop: scale(8, layout), minHeight: 0, overflow: "hidden" },
    body: {
      flex: 1,
      flexDirection: "row",
      gap: layout.columnGap,
      alignItems: "flex-start",
      overflow: "hidden",
    },
    leftCol: {
      width: `${layout.leftColumnWidthPercent}%`,
      flexDirection: "column",
      gap: layout.sectionGap ?? SECTION_GAP_PT,
      overflow: "hidden",
    },
    rightCol: {
      width: `${layout.rightColumnWidthPercent}%`,
      flexDirection: "column",
      gap: layout.sectionGap ?? SECTION_GAP_PT,
      overflow: "hidden",
    },
    sectionBlock: { width: "100%" },
    sectionHeading: {
      fontSize: heading,
      fontWeight: 700,
      marginBottom: scale(5, layout),
      letterSpacing: 0.4,
      color: text,
    },
    summaryText: { lineHeight: 1.35, fontSize: body, color: muted },
    bulletRow: { flexDirection: "row", marginBottom: scale(3, layout), paddingRight: 4 },
    bulletDot: { width: 8, fontSize: body, lineHeight: 1.32 },
    bulletText: { flex: 1, lineHeight: 1.32, fontSize: body, color: muted },
    expBlock: { marginBottom: scale(6, layout) },
    roleTitle: {
      fontSize: scale(9, layout),
      fontWeight: 700,
      color: accent,
      marginBottom: 1,
    },
    expMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    expCompany: { fontSize: scale(8, layout), color: muted, flex: 1, paddingRight: 6 },
    expDates: { fontSize: scale(8, layout), color: muted, textAlign: "right", maxWidth: "48%" },
    skillGroup: { marginBottom: scale(5, layout) },
    skillGroupTitle: {
      fontSize: body,
      fontWeight: 700,
      color: accent,
      marginBottom: scale(2, layout),
    },
    skillItem: {
      fontSize: body,
      color: muted,
      marginBottom: scale(1.5, layout),
      lineHeight: 1.22,
    },
    certTitle: {
      fontSize: body,
      fontWeight: 700,
      color: accent,
      marginBottom: 1,
    },
    certDetail: {
      fontSize: scale(8, layout),
      lineHeight: 1.3,
      color: muted,
      marginBottom: scale(4, layout),
    },
    eduDegree: { fontSize: body, fontWeight: 700, color: muted },
    eduLine: { fontSize: scale(8, layout), color: muted, lineHeight: 1.22 },
  });
}

function scale(value: number, layout: ResumeLayout) {
  return Math.round(value * layout.spacingScale * 10) / 10;
}

function EmailIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 24 24">
      <Path d="M4 4h16v16H4V4zm0 4l8 5 8-5" stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function GlobeIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

function LinkedInIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 24 24">
      <Path d="M6 9v10M6 6v.01M10 19v-7c0-2 1-3 3-3s3 1 3 3v7M10 9v10" stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function PhoneIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 24 24">
      <Path
        d="M7 3h4l1 4-2 1c1 2 3 4 5 5l1-2 4 1v4c0 1-1 2-2 2C9 18 6 15 4 11c0-1 1-2 2-2z"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

type ResumePDFProps = {
  data: MasterResume;
  photoSrc?: string;
  layout?: ResumeLayout;
  extras?: ResumeEditorExtras;
};

type PdfTextStyle = ReturnType<typeof buildStyles>[keyof ReturnType<typeof buildStyles>];

function fieldStyle(
  extras: ResumeEditorExtras | undefined,
  fieldId: string,
  base: PdfTextStyle,
): PdfTextStyle {
  const f = extras ? getFieldFormat(extras, fieldId) : {};
  return applyPdfFieldFormat(base as Record<string, unknown>, f) as PdfTextStyle;
}

function PdfLink({
  enabled,
  url,
  style,
  children,
  accent,
}: {
  enabled?: boolean;
  url?: string;
  style: PdfTextStyle;
  children: string;
  accent: string;
}) {
  if (enabled && url) {
    return (
      <Link src={url} style={{ ...style, color: accent, textDecoration: "none" }}>
        {children}
      </Link>
    );
  }
  return <Text style={style}>{children}</Text>;
}

export function ResumePDF({ data, photoSrc, layout: layoutProp, extras }: ResumePDFProps) {
  const baseLayout = layoutProp ?? REFERENCE_RESUME_LAYOUT;
  const fitInput = { resume: data, layout: baseLayout, extras };
  const contentScale = computeResumeContentScale(fitInput);
  const layout = layoutWithBakedContentScale({
    ...layoutForFitMeasurement(baseLayout),
    contentScale,
  });
  const design = extras?.design ?? DEFAULT_PAGE_DESIGN;
  const styles = buildStyles(layout, design);
  const leftExperience = data.experience.slice(0, layout.leftExperienceCount);
  const rightExperience = data.experience.slice(layout.leftExperienceCount);
  const certifications = filterNonemptyCertifications(data.certifications);
  const education = filterNonemptyEducation(data.education);
  const imageSrc = extras?.photo.dataUrl || photoSrc || data.photoUrl;

  const sectionOrder = extras?.sectionOrder ?? {
    left: ["summary", "achievements", "experience-left"] as ResumeSectionId[],
    right: ["experience-right", "skills", "certifications", "education"] as ResumeSectionId[],
  };

  const SectionHeading = ({ children }: { children: string }) => (
    <Text style={styles.sectionHeading}>{children.toUpperCase()}</Text>
  );

  const FText = ({
    fieldId,
    children,
    style,
  }: {
    fieldId: string;
    children: string;
    style: PdfTextStyle;
  }) => {
    const resolvedStyle = fieldStyle(extras, fieldId, style);
    const spans = splitBoldSpans(children);
    if (spans.length === 1 && !spans[0]!.bold) {
      return <Text style={resolvedStyle}>{children}</Text>;
    }
    return (
      <Text style={resolvedStyle}>
        {spans.map((span, i) =>
          span.bold ? (
            <Text key={i} style={{ fontWeight: "bold" }}>
              {span.text}
            </Text>
          ) : (
            span.text
          ),
        )}
      </Text>
    );
  };

  const BulletList = ({ items, prefix }: { items: string[]; prefix: string }) => (
    <>
      {items.map((item, i) => {
        const fid = `${prefix}.${i}`;
        const fmt = extras ? getFieldFormat(extras, fid) : {};
        return (
          <View style={styles.bulletRow} key={i}>
            {fmt.bullet === false ? null : <Text style={styles.bulletDot}>•</Text>}
            <FText fieldId={fid} style={styles.bulletText}>
              {item}
            </FText>
          </View>
        );
      })}
    </>
  );

  const ExperienceBlock = ({ exp, index }: { exp: MasterResume["experience"][number]; index: number }) => {
    const datesLocation = [exp.dates, exp.location].filter(Boolean).join("  ");
    return (
      <View style={styles.expBlock}>
        <FText fieldId={`experience.${index}.role`} style={styles.roleTitle}>
          {exp.role}
        </FText>
        <View style={styles.expMetaRow}>
          <FText fieldId={`experience.${index}.company`} style={styles.expCompany}>
            {exp.company}
          </FText>
          {datesLocation ? <Text style={styles.expDates}>{datesLocation}</Text> : null}
        </View>
        <BulletList items={exp.bullets.filter(Boolean)} prefix={`experience.${index}.bullets`} />
      </View>
    );
  };

  const SkillsBlock = ({ skills }: { skills: MasterResume["skills"] }) => (
    <>
      {Object.entries(skills).map(([group, items]) => (
        <View style={styles.skillGroup} key={group}>
          <Text style={styles.skillGroupTitle}>{group}</Text>
          {items.filter(Boolean).map((s, j) => (
            <View style={styles.bulletRow} key={j}>
              <Text style={styles.bulletDot}>•</Text>
              <FText fieldId={`skills.${group}.${j}`} style={styles.bulletText}>
                {s}
              </FText>
            </View>
          ))}
        </View>
      ))}
    </>
  );

  const renderSection = (sectionId: ResumeSectionId) => {
    switch (sectionId) {
      case "summary":
        return (
          <View style={styles.sectionBlock} key={sectionId}>
            <SectionHeading>Summary</SectionHeading>
            <FText fieldId="summary" style={styles.summaryText}>
              {data.summary}
            </FText>
          </View>
        );
      case "achievements":
        return (
          <View style={styles.sectionBlock} key={sectionId}>
            <SectionHeading>Key Achievements</SectionHeading>
            <BulletList items={data.keyAchievements.filter(Boolean)} prefix="keyAchievements" />
          </View>
        );
      case "experience-left":
        return (
          <View style={styles.sectionBlock} key={sectionId}>
            <SectionHeading>Experience</SectionHeading>
            {leftExperience.map((exp, i) => (
              <ExperienceBlock exp={exp} index={i} key={i} />
            ))}
          </View>
        );
      case "experience-right":
        if (rightExperience.length === 0) return null;
        return (
          <View style={styles.sectionBlock} key={sectionId}>
            {rightExperience.map((exp, i) => (
              <ExperienceBlock exp={exp} index={i + layout.leftExperienceCount} key={i} />
            ))}
          </View>
        );
      case "skills":
        return (
          <View style={styles.sectionBlock} key={sectionId}>
            <SectionHeading>Skills</SectionHeading>
            <SkillsBlock skills={data.skills} />
          </View>
        );
      case "certifications":
        if (certifications.length === 0) return null;
        return (
          <View style={styles.sectionBlock} key={sectionId}>
            <SectionHeading>Certification</SectionHeading>
            {certifications.map((c, i) => (
              <View key={i}>
                <FText fieldId={`certifications.${i}.title`} style={styles.certTitle}>
                  {c.title}
                </FText>
                <FText fieldId={`certifications.${i}.detail`} style={styles.certDetail}>
                  {c.detail}
                </FText>
              </View>
            ))}
          </View>
        );
      case "education":
        if (education.length === 0) return null;
        return (
          <View style={styles.sectionBlock} key={sectionId}>
            <SectionHeading>Education</SectionHeading>
            {education.map((e, i) => (
              <View key={i}>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <View>
                    <FText fieldId={`education.${i}.degree`} style={styles.eduDegree}>
                      {e.degree}
                    </FText>
                    <FText fieldId={`education.${i}.school`} style={styles.eduLine}>
                      {e.school}
                    </FText>
                    <FText fieldId={`education.${i}.location`} style={styles.eduLine}>
                      {e.location}
                    </FText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  const photoSettings = extras?.photo ?? { posX: 50, posY: 35, scale: 1.15 };
  const photoDim = layout.photoSize * photoSettings.scale;

  return (
    <Document>
      <Page size="A4" wrap={false} style={styles.page}>
        <View style={styles.contentClip}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FText fieldId="name" style={styles.name}>
              {data.name}
            </FText>
            <FText fieldId="title" style={styles.title}>
              {data.title}
            </FText>
            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <EmailIcon color={design.accentColor} />
                <PdfLink
                  enabled={extras?.links.email.enabled}
                  url={extras?.links.email.url}
                  style={styles.contactItem}
                  accent={design.accentColor}
                >
                  {data.email}
                </PdfLink>
              </View>
              <View style={styles.contactItem}>
                <GlobeIcon color={design.accentColor} />
                <PdfLink
                  enabled={extras?.links.website.enabled}
                  url={extras?.links.website.url}
                  style={styles.contactItem}
                  accent={design.accentColor}
                >
                  {data.website}
                </PdfLink>
              </View>
              <View style={styles.contactItem}>
                <LinkedInIcon color={design.accentColor} />
                <PdfLink
                  enabled={extras?.links.linkedin.enabled}
                  url={extras?.links.linkedin.url}
                  style={styles.contactItem}
                  accent={design.accentColor}
                >
                  {extras?.links.linkedin.label ?? "LinkedIn"}
                </PdfLink>
              </View>
              <View style={styles.contactPhone}>
                <PhoneIcon color={design.textColor} />
                <FText fieldId="contact.phone" style={styles.contactPhone}>
                  {data.phone}
                </FText>
              </View>
            </View>
          </View>
          {imageSrc ? (
            <View style={styles.photoWrap}>
              <Image
                src={imageSrc}
                style={{
                  ...styles.photo,
                  width: photoDim,
                  height: photoDim,
                  marginLeft: (layout.photoSize - photoDim) * (photoSettings.posX / 100),
                  marginTop: (layout.photoSize - photoDim) * (photoSettings.posY / 100),
                }}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.main}>
          <View style={styles.body}>
            <View style={styles.leftCol}>
              {sectionOrder.left.map((id) => renderSection(id))}
            </View>
            <View style={styles.rightCol}>
              {sectionOrder.right.map((id) => renderSection(id))}
            </View>
          </View>
        </View>
        </View>
      </Page>
    </Document>
  );
}
