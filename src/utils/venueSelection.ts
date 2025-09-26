import { Tables } from "@/integrations/supabase/types";

type Venue = Tables<'venues'>;

export interface EventRequirements {
  participants: number;
  facilitiesRequired: string[];
  preferredDateTime: string;
  priority: 'high' | 'medium' | 'low';
  eventType: 'technical' | 'non-technical';
  spaceType?: string;
}

export interface VenueMatch {
  venue: Venue;
  score: number;
  reason: string;
  alternative?: boolean;
}

export class VenueSelectionAlgorithm {
  private venues: Venue[];

  constructor(venues: Venue[]) {
    this.venues = venues;
  }

  /**
   * Calculate minimum required area using 6 sq ft per person formula
   */
  private calculateRequiredArea(participants: number): number {
    return participants * 6;
  }

  /**
   * Check if venue is available at requested time
   */
  private isVenueAvailable(venue: Venue, requestedDateTime: string): boolean {
    if (!venue.booked_slots || venue.booked_slots.length === 0) return true;

    const requestedDate = new Date(requestedDateTime).toISOString().split('T')[0];
    const requestedTime = new Date(requestedDateTime).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return !venue.booked_slots.some(slot => {
      if (slot.includes(requestedDate)) {
        const timeRange = slot.split(' ')[1]; // Get time part
        if (timeRange && timeRange.includes('-')) {
          const [startTime, endTime] = timeRange.split('-');
          return requestedTime >= startTime && requestedTime <= endTime;
        }
      }
      return false;
    });
  }

  /**
   * Check if venue has required facilities
   */
  private hasFacilities(venue: Venue, requiredFacilities: string[]): boolean {
    if (!requiredFacilities || requiredFacilities.length === 0) return true;
    if (!venue.facilities || venue.facilities.length === 0) return false;

    return requiredFacilities.every(required => 
      venue.facilities!.some(available => 
        available.toLowerCase().includes(required.toLowerCase()) ||
        required.toLowerCase().includes(available.toLowerCase())
      )
    );
  }

  /**
   * Calculate match score for a venue
   */
  private calculateScore(
    venue: Venue, 
    requirements: EventRequirements,
    isAvailable: boolean,
    hasFacilities: boolean,
    areaMatch: boolean
  ): number {
    let score = 0;

    // Area efficiency (prefer smaller venues that fit)
    if (areaMatch) {
      const efficiency = venue.area_sqft / this.calculateRequiredArea(requirements.participants);
      score += Math.max(0, 100 - (efficiency - 1) * 20); // Penalty for oversized venues
    }

    // Availability bonus
    if (isAvailable) score += 50;

    // Facilities match bonus
    if (hasFacilities) score += 30;

    // Capacity match bonus
    if (venue.capacity >= requirements.participants) score += 20;

    // Priority adjustment
    if (requirements.priority === 'high') score += 10;

    return score;
  }

  /**
   * Find best matching venues
   */
  public findBestVenues(requirements: EventRequirements): {
    exactMatches: VenueMatch[];
    alternatives: VenueMatch[];
    noMatch: boolean;
  } {
    const requiredArea = this.calculateRequiredArea(requirements.participants);
    const matches: VenueMatch[] = [];
    const alternatives: VenueMatch[] = [];

    this.venues.forEach(venue => {
      const areaMatch = venue.area_sqft >= requiredArea;
      const isAvailable = this.isVenueAvailable(venue, requirements.preferredDateTime);
      const hasFacilities = this.hasFacilities(venue, requirements.facilitiesRequired);
      
      const score = this.calculateScore(venue, requirements, isAvailable, hasFacilities, areaMatch);
      
      let reason = '';
      if (areaMatch && isAvailable && hasFacilities) {
        reason = 'Perfect match: Adequate space, available, and has required facilities';
      } else if (!areaMatch) {
        reason = `Too small: Needs ${requiredArea} sq ft, has ${venue.area_sqft} sq ft`;
      } else if (!isAvailable) {
        reason = 'Venue is booked at requested time';
      } else if (!hasFacilities) {
        const missing = requirements.facilitiesRequired.filter(req => 
          !venue.facilities?.some(f => f.toLowerCase().includes(req.toLowerCase()))
        );
        reason = `Missing facilities: ${missing.join(', ')}`;
      }

      const venueMatch: VenueMatch = {
        venue,
        score,
        reason,
        alternative: !areaMatch || !isAvailable || !hasFacilities
      };

      if (venueMatch.alternative) {
        alternatives.push(venueMatch);
      } else {
        matches.push(venueMatch);
      }
    });

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);
    alternatives.sort((a, b) => b.score - a.score);

    // For high priority events, prefer smallest suitable venue
    if (requirements.priority === 'high' && matches.length > 0) {
      matches.sort((a, b) => {
        if (Math.abs(a.score - b.score) < 10) { // Similar scores
          return a.venue.area_sqft - b.venue.area_sqft; // Prefer smaller
        }
        return b.score - a.score; // Prefer higher score
      });
    }

    return {
      exactMatches: matches,
      alternatives: alternatives.slice(0, 3), // Top 3 alternatives
      noMatch: matches.length === 0 && alternatives.length === 0
    };
  }

  /**
   * Get suggested time slots for a venue
   */
  public getSuggestedTimeSlots(venue: Venue, requestedDate: string): string[] {
    const suggestions = [
      '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
    ];

    if (!venue.booked_slots || venue.booked_slots.length === 0) {
      return suggestions;
    }

    const bookedTimes = venue.booked_slots
      .filter(slot => slot.includes(requestedDate))
      .map(slot => {
        const timeRange = slot.split(' ')[1];
        return timeRange ? timeRange.split('-') : [];
      })
      .flat();

    return suggestions.filter(time => 
      !bookedTimes.some(bookedTime => 
        Math.abs(
          new Date(`2000-01-01 ${time}`).getTime() - 
          new Date(`2000-01-01 ${bookedTime}`).getTime()
        ) < 2 * 60 * 60 * 1000 // 2-hour buffer
      )
    );
  }
}