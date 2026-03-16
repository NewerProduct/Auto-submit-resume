import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { ParsedResumeData } from '@/types';

export class ResumeParser {
  // 解析简历文件
  static async parseResume(filePath: string, filename: string): Promise<{ content: string; parsedData: ParsedResumeData }> {
    const extension = path.extname(filename).toLowerCase();
    
    let content = '';
    
    try {
      switch (extension) {
        case '.pdf':
          content = await this.parsePDF(filePath);
          break;
        case '.doc':
        case '.docx':
          content = await this.parseWord(filePath);
          break;
        default:
          throw new Error('不支持的文件格式');
      }
      
      // 解析简历内容
      const parsedData = this.extractResumeData(content);
      
      return {
        content,
        parsedData,
      };
    } catch (error) {
      console.error('简历解析失败:', error);
      throw new Error('简历解析失败');
    }
  }
  
  // 解析PDF文件
  private static async parsePDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF解析失败:', error);
      throw new Error('PDF解析失败');
    }
  }
  
  // 解析Word文件
  private static async parseWord(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('Word解析失败:', error);
      throw new Error('Word解析失败');
    }
  }
  
  // 提取简历数据
  private static extractResumeData(content: string): ParsedResumeData {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const parsedData: ParsedResumeData = {
      skills: [],
    };
    
    // 提取姓名
    parsedData.name = this.extractName(content, lines);
    
    // 提取联系方式
    const phoneMatch = content.match(/1[3-9]\d{9}/);
    if (phoneMatch) {
      parsedData.phone = phoneMatch[0];
    }
    
    const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      parsedData.email = emailMatch[0];
    }
    
    // 提取学历
    parsedData.education = this.extractEducation(content, lines);
    
    // 提取工作经验
    parsedData.experience = this.extractExperience(content, lines);
    
    // 提取技能
    parsedData.skills = this.extractSkills(content, lines);
    
    // 提取地点
    parsedData.location = this.extractLocation(content, lines);
    
    // 提取期望薪资
    parsedData.expectedSalary = this.extractExpectedSalary(content, lines);
    
    return parsedData;
  }
  
  // 提取姓名
  private static extractName(content: string, lines: string[]): string | undefined {
    // 简单的姓名提取逻辑，通常在简历开头
    const namePatterns = [
      /^姓名[：:]\s*(.+)$/,
      /^(.+?)\s*(?:男|女)/,
      /^(.+?)\s*\d{2,3}岁/,
      /^(.+?)\s*电话/,
      /^(.+?)\s*邮箱/,
    ];
    
    for (const line of lines.slice(0, 10)) {
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match && match[1] && match[1].length <= 4 && /^[\u4e00-\u9fa5]+$/.test(match[1])) {
          return match[1];
        }
      }
    }
    
    return undefined;
  }
  
  // 提取学历
  private static extractEducation(content: string, lines: string[]): string | undefined {
    const educationKeywords = ['博士', '硕士', '本科', '专科', '大专', '高中', '中专'];
    
    for (const line of lines) {
      for (const keyword of educationKeywords) {
        if (line.includes(keyword)) {
          // 尝试提取更完整的学历信息
          const educationMatch = line.match(/(博士|硕士|本科|专科|大专|高中|中专)(学历|学位)?/);
          if (educationMatch) {
            return educationMatch[1];
          }
        }
      }
    }
    
    return undefined;
  }
  
  // 提取工作经验
  private static extractExperience(content: string, lines: string[]): string | undefined {
    const experiencePatterns = [
      /(\d+)[年岁]/,
      /工作经验[：:]?\s*(\d+.*?年)/,
      /(\d+.*?年).*?工作经验/,
    ];
    
    for (const line of lines) {
      for (const pattern of experiencePatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
    
    return undefined;
  }
  
  // 提取技能
  private static extractSkills(content: string, lines: string[]): string[] {
    const skills: string[] = [];
    
    // 常见技术技能关键词
    const techSkills = [
      'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
      'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'HTML', 'CSS', 'Sass', 'Less', 'Tailwind', 'Bootstrap',
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle',
      'Git', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD',
      'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier',
      'Linux', 'Windows', 'macOS', 'Ubuntu', 'CentOS',
    ];
    
    // 中文技能关键词
    const chineseSkills = [
      '前端开发', '后端开发', '全栈开发', '移动开发', 'Web开发',
      '数据库', '服务器', '网络', '安全', '测试', '运维',
      '产品设计', 'UI设计', 'UX设计', '项目管理',
    ];
    
    const allSkills = [...techSkills, ...chineseSkills];
    
    // 在内容中查找技能关键词
    for (const skill of allSkills) {
      if (content.includes(skill) && !skills.includes(skill)) {
        skills.push(skill);
      }
    }
    
    // 尝试从技能列表行中提取
    for (const line of lines) {
      if (line.includes('技能') || line.includes('技术') || line.includes('擅长')) {
        const skillsInLine = line.split(/[，,、；;]/).map(s => s.trim()).filter(s => s.length > 0);
        for (const skill of skillsInLine) {
          if (skill.length <= 20 && !skills.includes(skill)) {
            skills.push(skill);
          }
        }
      }
    }
    
    return skills.slice(0, 20); // 限制返回20个技能
  }
  
  // 提取地点
  private static extractLocation(content: string, lines: string[]): string | undefined {
    const cities = [
      '北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '武汉', '西安',
      '重庆', '天津', '青岛', '大连', '厦门', '长沙', '郑州', '济南', '哈尔滨', '沈阳',
      '长春', '石家庄', '太原', '呼和浩特', '兰州', '银川', '西宁', '乌鲁木齐', '拉萨',
      '合肥', '南昌', '福州', '南宁', '昆明', '贵阳', '海口',
    ];
    
    for (const line of lines) {
      for (const city of cities) {
        if (line.includes(city)) {
          // 尝试提取完整的地点信息
          const locationMatch = line.match(/(北京|上海|广州|深圳|杭州|南京|苏州|成都|武汉|西安|重庆|天津|青岛|大连|厦门|长沙|郑州|济南|哈尔滨|沈阳|长春|石家庄|太原|呼和浩特|兰州|银川|西宁|乌鲁木齐|拉萨|合肥|南昌|福州|南宁|昆明|贵阳|海口)(市|省|区)?/);
          if (locationMatch) {
            return locationMatch[1];
          }
        }
      }
    }
    
    return undefined;
  }
  
  // 提取期望薪资
  private static extractExpectedSalary(content: string, lines: string[]): string | undefined {
    const salaryPatterns = [
      /期望薪资[：:]?\s*(\d+[kK]-?\d*[kK]?)/,
      /薪资要求[：:]?\s*(\d+[kK]-?\d*[kK]?)/,
      /待遇[：:]?\s*(\d+[kK]-?\d*[kK]?)/,
      /(\d+[kK]-?\d*[kK]?).*?月薪/,
      /月薪[：:]?\s*(\d+[kK]-?\d*[kK]?)/,
    ];
    
    for (const line of lines) {
      for (const pattern of salaryPatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
    
    return undefined;
  }
}
