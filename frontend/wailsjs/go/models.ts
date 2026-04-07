export namespace classifier {
	
	export class Category {
	    Key: string;
	    Name: string;
	    Description: string;
	
	    static createFrom(source: any = {}) {
	        return new Category(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Key = source["Key"];
	        this.Name = source["Name"];
	        this.Description = source["Description"];
	    }
	}
	export class ExtractedCategory {
	    key: string;
	    name: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtractedCategory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.name = source["name"];
	        this.description = source["description"];
	    }
	}

}

export namespace db {
	
	export class AutoApprovalRule {
	    ID: number;
	    CategoryKey: string;
	    MinConfidence: number;
	    Enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AutoApprovalRule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.CategoryKey = source["CategoryKey"];
	        this.MinConfidence = source["MinConfidence"];
	        this.Enabled = source["Enabled"];
	    }
	}
	export class ProcessedMessage {
	    ID: number;
	    MessageTS: string;
	    ChannelID: string;
	    Author: string;
	    Category: string;
	    Confidence: number;
	    Summary: string;
	    Reasoning: string;
	    Routed: boolean;
	    Status: string;
	    // Go type: time
	    CreatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new ProcessedMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.MessageTS = source["MessageTS"];
	        this.ChannelID = source["ChannelID"];
	        this.Author = source["Author"];
	        this.Category = source["Category"];
	        this.Confidence = source["Confidence"];
	        this.Summary = source["Summary"];
	        this.Reasoning = source["Reasoning"];
	        this.Routed = source["Routed"];
	        this.Status = source["Status"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace slack {
	
	export class ChannelInfo {
	    id: string;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new ChannelInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	    }
	}
	export class MentionTarget {
	    id: string;
	    name: string;
	    type: string;
	
	    static createFrom(source: any = {}) {
	        return new MentionTarget(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	    }
	}

}

