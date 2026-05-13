import {
  AlignmentType,
  Document,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun,
  convertInchesToTwip
} from "docx";
import { buildFormattedResumeContent, type CandidateResumeInput } from "@/lib/resume-inputs";

const FONT = "Times New Roman";
const FONT_SIZE = 20;
type ParagraphAlignment = (typeof AlignmentType)[keyof typeof AlignmentType];

function run(text: string, bold = false) {
  return new TextRun({
    text,
    bold,
    font: FONT,
    size: FONT_SIZE
  });
}

function para(children: TextRun[], alignment: ParagraphAlignment = AlignmentType.JUSTIFIED) {
  return new Paragraph({
    children,
    alignment,
    spacing: {
      before: 0,
      after: 0,
      line: 240,
      lineRule: LineRuleType.AUTO
    }
  });
}

function textPara(text: string, bold = false, alignment: ParagraphAlignment = AlignmentType.JUSTIFIED) {
  return para([run(text, bold)], alignment);
}

function labelPara(label: string, text: string) {
  return para([run(label, true), run(text ? ` ${text}` : "")]);
}

function blankPara() {
  return new Paragraph({
    children: [run("")],
    spacing: { before: 0, after: 0, line: 120, lineRule: LineRuleType.AUTO }
  });
}

function buildDoc(input: CandidateResumeInput) {
  const content = buildFormattedResumeContent(input);
  const children: Paragraph[] = [
    textPara(input.fullName, true, AlignmentType.CENTER),
    textPara(input.jobTitle, true, AlignmentType.CENTER),
    para(
      [
        run("Email: ", true),
        run(input.email),
        run(" | ", true),
        run(`Phone: ${input.phone}`, true),
        run(" | ", true),
        run("LinkedIn: ", true),
        run(input.linkedin)
      ],
      AlignmentType.CENTER
    ),
    blankPara(),
    textPara("Professional Summary", true),
    ...content.summary.map((line) => textPara(line)),
    textPara("Skill Matrix", true),
    ...content.skillMatrix.map((section) => labelPara(`${section.heading}:`, section.lines.join(", "))),
    textPara("Professional Experience", true)
  ];

  content.clients.forEach((section) => {
    children.push(
      textPara(`${section.client.clientName}, ${section.client.location} | ${section.client.timeline}`, true),
      textPara(`Job Title: ${section.client.jobTitle}`, true),
      labelPara("Project Description:", section.projectDescription),
      labelPara("Key Contributions:", section.keyContributions),
      textPara("Roles and Responsibilities:", true),
      ...section.responsibilities.map((line) => textPara(line)),
      textPara("Key Achievements:", true),
      ...section.achievements.map((line) => textPara(line)),
      labelPara("Environment:", section.environment),
      blankPara()
    );
  });

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: FONT_SIZE,
            color: "000000"
          },
          paragraph: {
            spacing: {
              before: 0,
              after: 0,
              line: 240,
              lineRule: LineRuleType.AUTO
            }
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240,
              height: 15840
            },
            margin: {
              top: convertInchesToTwip(0.31875),
              bottom: convertInchesToTwip(0.4125),
              left: convertInchesToTwip(0.375),
              right: convertInchesToTwip(0.375)
            }
          }
        },
        children
      }
    ]
  });
}

export function safeResumeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume";
}

export class ResumeDocxService {
  async renderToBuffer(input: CandidateResumeInput): Promise<Buffer> {
    const doc = buildDoc(input);
    return Packer.toBuffer(doc);
  }
}
