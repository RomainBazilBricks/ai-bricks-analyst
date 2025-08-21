import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  User, 
  Building2, 
  Star,
  AlertTriangle
} from "lucide-react";

interface ReputationItem {
  name: string;
  score?: number;
  justification?: string;
  type: 'owner' | 'company';
  siret?: string;
  experienceYears?: number;
}

interface ReputationDisplayProps {
  projectOwner?: {
    name: string;
    experienceYears: number;
    reputationScore?: number;
    reputationJustification?: string;
  };
  company?: {
    name: string;
    siret: string;
    reputationScore?: number;
    reputationJustification?: string;
  };
}

const getScoreColor = (score?: number) => {
  if (!score) return "bg-gray-100 text-gray-600";
  if (score >= 8) return "bg-green-100 text-green-800";
  if (score >= 6) return "bg-yellow-100 text-yellow-800";
  if (score >= 4) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
};

const getScoreIcon = (score?: number) => {
  if (!score) return <AlertTriangle className="h-3 w-3" />;
  return <Star className="h-3 w-3" />;
};

const ReputationCard = ({ item }: { item: ReputationItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-md p-3 border border-indigo-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {item.type === 'owner' ? (
            <User className="h-4 w-4 text-indigo-600" />
          ) : (
            <Building2 className="h-4 w-4 text-indigo-600" />
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-800">{item.name}</h3>
            {item.type === 'owner' && item.experienceYears && (
              <p className="text-xs text-gray-600">{item.experienceYears} ans d'expérience</p>
            )}
            {item.type === 'company' && item.siret && (
              <p className="text-xs text-gray-600">SIRET: {item.siret}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`flex items-center gap-1 ${getScoreColor(item.score)}`}
          >
            {getScoreIcon(item.score)}
            {item.score ? `${item.score}/10` : "N/A"}
          </Badge>
          
          {item.justification && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && item.justification && (
        <div className="mt-2 pt-2 border-t border-indigo-200">
          <div className="bg-white rounded-md p-2 border border-indigo-100">
            <p className="text-xs font-medium text-gray-700 mb-1">Justification de l'analyse :</p>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
              {item.justification}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReputationDisplay = ({ projectOwner, company }: ReputationDisplayProps) => {
  const items: ReputationItem[] = [];

  if (projectOwner) {
    items.push({
      name: projectOwner.name,
      score: projectOwner.reputationScore,
      justification: projectOwner.reputationJustification,
      type: 'owner',
      experienceYears: projectOwner.experienceYears,
    });
  }

  if (company) {
    items.push({
      name: company.name,
      score: company.reputationScore,
      justification: company.reputationJustification,
      type: 'company',
      siret: company.siret,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-medium text-gray-800">Analyse de réputation</h3>
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <ReputationCard key={index} item={item} />
        ))}
      </div>
    </div>
  );
};
