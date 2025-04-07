import { eq, and, inArray, like, desc, asc, sql, not, or } from "drizzle-orm";
import {
  Service,
  serviceAttributeValues,
  ServiceFaq,
  serviceFaqs,
  services,
} from "./service.schema";
import db from "../../config/database";
import { serviceCategories } from "../service-categories/service-category.schema";
import { taskers, taskerSkills } from "../taskers/tasker.schema";
import { users } from "../users/user.schema";
import { bookings } from "../bookings/booking.schema";
import { reviews } from "../reviews/review.schema";
import { AppError } from "../../utils/app-error";
import slugify from "slugify";
import { locations } from "../locations/location.schema";

export interface ServiceSearchParams {
  query?: string;
  categoryId?: number;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  isFeatured?: boolean;
  isPopular?: boolean;
  sort?: "name" | "price" | "rating" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface ServiceWithRelations extends Service {
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  attributes?: {
    id: number;
    name: string;
    value: string;
  }[];
  faqs?: ServiceFaq[];
}

export interface ServiceListingParams {
  categoryId?: number;
  search?: string;
  sort?: "popular" | "rating" | "price" | "newest";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TaskerSearchParams {
  serviceId: number;
  locationId?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  availableDate?: Date;
  sort?: "rating" | "price" | "distance" | "completedTasks";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ServiceWithTaskers {
  id: number;
  name: string;
  description?: string;
  shortDescription?: string;
  basePrice?: number;
  pricingType?: string;
  image?: string;
  gallery?: string;
  averageRating?: number;
  totalReviews?: number;
  slug: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  taskers?: Array<{
    id: number;
    name: string;
    profilePhoto?: string;
    rating?: number;
    hourlyRate: number;
    completedTasks: number;
    distance?: number;
    quickPitch?: string;
  }>;
}

export interface TaskerForService {
  id: number;
  name: string;
  profilePhoto?: string;
  rating?: number;
  hourlyRate: number;
  completedTasks: number;
  distance?: number;
  quickPitch?: string;
  availability?: string;
  location?: {
    city: string;
    state: string;
  };
  skills?: Array<{
    serviceId: number;
    serviceName: string;
    hourlyRate: number;
    experience?: string;
    experienceYears?: number;
  }>;
  reviews?: Array<{
    rating: number;
    comment?: string;
    date: Date;
    userName: string;
  }>;
}

export const serviceService = {
  /**
   * Get all services with optional filtering and sorting
   */
  async getServices(
    params: ServiceListingParams = {}
  ): Promise<ServiceWithTaskers[]> {
    const {
      categoryId,
      search,
      sort = "popular",
      order = "desc",
      page = 1,
      limit = 20,
    } = params;

    // Build query conditions
    const conditions = [];

    // Only show active services
    conditions.push(eq(services.isActive, true));

    // Filter by category if provided
    if (categoryId) {
      conditions.push(eq(services.categoryId, categoryId));
    }

    // Search by name or description
    if (search) {
      conditions.push(
        or(
          like(services.name, `%${search}%`),
          like(services.description || "", `%${search}%`),
          like(services.shortDescription || "", `%${search}%`)
        )
      );
    }

    // Determine sort column and direction
    let sortColumn;
    const sortDirection = order === "asc" ? asc : desc;

    switch (sort) {
      case "popular":
        sortColumn = services.totalReviews;
        break;
      case "rating":
        sortColumn = services.averageRating;
        break;
      case "price":
        sortColumn = services.basePrice;
        break;
      case "newest":
      default:
        sortColumn = services.createdAt;
    }

    // Execute query with pagination
    const serviceResults = await db
      .select({
        service: services,
        categoryName: serviceCategories.name,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .leftJoin(
        serviceCategories,
        eq(services.categoryId, serviceCategories.id)
      )
      .where(and(...conditions))
      .orderBy(sortDirection(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    // Transform results
    const servicesWithTaskers: ServiceWithTaskers[] = [];

    for (const result of serviceResults) {
      const service: ServiceWithTaskers = {
        ...result.service,
        category: result.categoryName
          ? {
              id: result.service.categoryId!,
              name: result.categoryName,
              slug: result.categorySlug!,
            }
          : undefined,
        taskers: [],
      };

      servicesWithTaskers.push(service);
    }

    // Get service IDs to fetch taskers
    const serviceIds = servicesWithTaskers.map((service) => service.id);

    // Fetch top taskers for these services (limited preview)
    await this.populateTopTaskersForServices(
      servicesWithTaskers,
      serviceIds,
      3
    );

    return servicesWithTaskers;
  },

  /**
   * Get a single service by ID with its taskers
   */
  async getServiceById(id: number): Promise<ServiceWithTaskers | undefined> {
    const result = await db
      .select({
        service: services,
        categoryName: serviceCategories.name,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .leftJoin(
        serviceCategories,
        eq(services.categoryId, serviceCategories.id)
      )
      .where(eq(services.id, id))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const service: ServiceWithTaskers = {
      ...result[0].service,
      category: result[0].categoryName
        ? {
            id: result[0].service.categoryId!,
            name: result[0].categoryName,
            slug: result[0].categorySlug!,
          }
        : undefined,
      taskers: [],
    };

    // Populate top taskers for this service (limited preview)
    await this.populateTopTaskersForServices([service], [id], 5);

    return service;
  },

  /**
   * Get a single service by slug with its taskers
   */
  async getServiceBySlug(
    slug: string
  ): Promise<ServiceWithTaskers | undefined> {
    const result = await db
      .select({
        service: services,
        categoryName: serviceCategories.name,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .leftJoin(
        serviceCategories,
        eq(services.categoryId, serviceCategories.id)
      )
      .where(eq(services.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const service: ServiceWithTaskers = {
      ...result[0].service,
      category: result[0].categoryName
        ? {
            id: result[0].service.categoryId!,
            name: result[0].categoryName,
            slug: result[0].categorySlug!,
          }
        : undefined,
      taskers: [],
    };

    // Populate top taskers for this service (limited preview)
    await this.populateTopTaskersForServices([service], [service.id], 5);

    return service;
  },

  /**
   * Get featured services for homepage
   */
  async getFeaturedServices(limit = 6): Promise<ServiceWithTaskers[]> {
    // Get featured services
    const featuredServices = await db
      .select({
        service: services,
        categoryName: serviceCategories.name,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .leftJoin(
        serviceCategories,
        eq(services.categoryId, serviceCategories.id)
      )
      .where(and(eq(services.isActive, true), eq(services.isFeatured, true)))
      .orderBy(desc(services.averageRating))
      .limit(limit);

    // Transform results
    const servicesWithTaskers: ServiceWithTaskers[] = featuredServices.map(
      (result) => ({
        ...result.service,
        category: result.categoryName
          ? {
              id: result.service.categoryId!,
              name: result.categoryName,
              slug: result.categorySlug!,
            }
          : undefined,
        taskers: [],
      })
    );

    // Get service IDs to fetch taskers
    const serviceIds = servicesWithTaskers.map((service) => service.id);

    // Fetch top taskers for these services (limited preview)
    await this.populateTopTaskersForServices(
      servicesWithTaskers,
      serviceIds,
      3
    );

    return servicesWithTaskers;
  },

  /**
   * Get popular services
   */
  async getPopularServices(limit = 6): Promise<ServiceWithTaskers[]> {
    // Get popular services
    const popularServices = await db
      .select({
        service: services,
        categoryName: serviceCategories.name,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .leftJoin(
        serviceCategories,
        eq(services.categoryId, serviceCategories.id)
      )
      .where(and(eq(services.isActive, true), eq(services.isPopular, true)))
      .orderBy(desc(services.totalReviews))
      .limit(limit);

    // Transform results
    const servicesWithTaskers: ServiceWithTaskers[] = popularServices.map(
      (result) => ({
        ...result.service,
        category: result.categoryName
          ? {
              id: result.service.categoryId!,
              name: result.categoryName,
              slug: result.categorySlug!,
            }
          : undefined,
        taskers: [],
      })
    );

    // Get service IDs to fetch taskers
    const serviceIds = servicesWithTaskers.map((service) => service.id);

    // Fetch top taskers for these services (limited preview)
    await this.populateTopTaskersForServices(
      servicesWithTaskers,
      serviceIds,
      3
    );

    return servicesWithTaskers;
  },

  /**
   * Helper method to populate top taskers for services (limited preview)
   */
  async populateTopTaskersForServices(
    servicesWithTaskers: ServiceWithTaskers[],
    serviceIds: number[],
    limit = 3
  ): Promise<void> {
    if (serviceIds.length === 0) return;

    // Create a map for quick lookup
    const serviceMap = new Map<number, ServiceWithTaskers>();
    servicesWithTaskers.forEach((service) => {
      serviceMap.set(service.id, service);
    });

    // Fetch top taskers who offer these services
    const taskerResults = await db
      .select({
        serviceId: taskerSkills.serviceId,
        taskerId: taskerSkills.taskerId,
        hourlyRate: taskerSkills.hourlyRate,
        quickPitch: taskerSkills.quickPitch,
        taskerFirstName: users.firstName,
        taskerLastName: users.lastName,
        profilePhoto: taskers.profilePhoto,
        rating: taskers.averageRating,
        completedTasks: taskers.totalTasksCompleted,
      })
      .from(taskerSkills)
      .innerJoin(taskers, eq(taskerSkills.taskerId, taskers.id))
      .innerJoin(users, eq(taskers.userId, users.id))
      .where(
        and(
          inArray(taskerSkills.serviceId, serviceIds),
          eq(taskerSkills.isActive, true),
          eq(taskers.isActive, true)
        )
      )
      .orderBy(desc(taskers.averageRating));

    // Group taskers by service and limit to top N per service
    const taskersByService = new Map<number, string[]>();

    taskerResults.forEach((result) => {
      if (!taskersByService.has(result.serviceId)) {
        taskersByService.set(result.serviceId, []);
      }

      const serviceTaskers = taskersByService.get(result.serviceId)!;
      if (serviceTaskers.length < limit) {
        serviceTaskers.push(result);
      }
    });

    // Add taskers to services
    for (const [serviceId, taskers] of taskersByService.entries()) {
      const service = serviceMap.get(serviceId);
      if (service) {
        service.taskers = taskers.map((result) => ({
          id: result.taskerId,
          name: `${result.taskerFirstName} ${result.taskerLastName || ""}`.trim(),
          profilePhoto: result.profilePhoto,
          rating: result.rating,
          hourlyRate: result.hourlyRate,
          completedTasks: result.completedTasks || 0,
          quickPitch: result.quickPitch,
        }));
      }
    }
  },

  /**
   * Get taskers for a specific service with filters
   */
  async getTaskersForService(
    serviceId: number,
    filters: {
      location?: { latitude: number; longitude: number; radius: number };
      minRating?: number;
      maxPrice?: number;
      minPrice?: number;
      availability?: { date: Date };
      page?: number;
      limit?: number;
      sort?: "rating" | "price" | "distance" | "completedTasks";
      order?: "asc" | "desc";
    } = {}
  ) {
    const {
      location,
      minRating,
      maxPrice,
      minPrice,
      availability,
      page = 1,
      limit = 20,
      sort = "rating",
      order = "desc",
    } = filters;

    // Build base query to find taskers who offer this service
    let query = db
      .select({
        taskerId: taskerSkills.taskerId,
        hourlyRate: taskerSkills.hourlyRate,
        quickPitch: taskerSkills.quickPitch,
        experience: taskerSkills.experience,
        experienceYears: taskerSkills.experienceYears,
        taskerFirstName: users.firstName,
        taskerLastName: users.lastName,
        profilePhoto: taskers.profilePhoto,
        rating: taskers.averageRating,
        completedTasks: taskers.totalTasksCompleted,
        locationId: taskers.locationId,
        locationCity: locations.city,
        locationState: locations.state,
        locationLatitude: locations.latitude,
        locationLongitude: locations.longitude,
      })
      .from(taskerSkills)
      .innerJoin(taskers, eq(taskerSkills.taskerId, taskers.id))
      .innerJoin(users, eq(taskers.userId, users.id))
      .leftJoin(locations, eq(taskers.locationId, locations.id))
      .where(
        and(
          eq(taskerSkills.serviceId, serviceId),
          eq(taskerSkills.isActive, true),
          eq(taskers.isActive, true)
        )
      )
      .$dynamic();

    // Apply price filters if provided
    if (minPrice !== undefined) {
      query = query.where(sql`${taskerSkills.hourlyRate} >= ${minPrice}`);
    }

    if (maxPrice !== undefined) {
      query = query.where(sql`${taskerSkills.hourlyRate} <= ${maxPrice}`);
    }

    // Apply rating filter if provided
    if (minRating !== undefined) {
      query = query.where(sql`${taskers.averageRating} >= ${minRating}`);
    }

    // Execute the query
    const taskerResults = await query;

    // Process results and calculate distances if coordinates provided
    let processedResults = taskerResults.map((result) => {
      let distance: number | undefined = undefined;

      // Calculate distance if coordinates are provided
      if (
        location &&
        result.locationLatitude !== null &&
        result.locationLongitude !== null
      ) {
        distance = calculateDistance(
          location.latitude,
          location.longitude,
          result.locationLatitude,
          result.locationLongitude
        );
      }

      return {
        id: result.taskerId,
        name: `${result.taskerFirstName} ${result.taskerLastName || ""}`.trim(),
        profilePhoto: result.profilePhoto,
        rating: result.rating,
        hourlyRate: result.hourlyRate,
        completedTasks: result.completedTasks || 0,
        quickPitch: result.quickPitch,
        distance,
        location: result.locationCity
          ? {
              city: result.locationCity,
              state: result.locationState || "",
            }
          : undefined,
        skills: [
          {
            serviceId,
            hourlyRate: result.hourlyRate,
            experience: result.experience,
            experienceYears: result.experienceYears,
          },
        ],
        reviews: [], // Will be populated later
      };
    });

    // Filter by distance if coordinates and radius provided
    if (location) {
      processedResults = processedResults.filter(
        (tasker) =>
          tasker.distance === undefined || tasker.distance <= location.radius
      );
    }

    // Filter by availability if date provided
    if (availability) {
      // Get tasker IDs to check availability
      const taskerIds = processedResults.map((tasker) => tasker.id);

      // Find bookings that overlap with the requested date
      const busyTaskers = await db
        .select({ taskerId: bookings.taskerId })
        .from(bookings)
        .where(
          and(
            inArray(bookings.taskerId, taskerIds),
            not(inArray(bookings.status, ["cancelled", "completed"])),
            sql`DATE(${bookings.startTime}) = DATE(${availability.date})`
          )
        );

      // Create a set of busy tasker IDs for quick lookup
      const busyTaskerIds = new Set(busyTaskers.map((b) => b.taskerId));

      // Filter out busy taskers
      processedResults = processedResults.filter(
        (tasker) => !busyTaskerIds.has(tasker.id)
      );
    }

    // Sort results
    processedResults.sort((a, b) => {
      let comparison = 0;

      switch (sort) {
        case "rating":
          comparison = (b.rating || 0) - (a.rating || 0);
          break;
        case "price":
          comparison = a.hourlyRate - b.hourlyRate;
          break;
        case "distance":
          // Handle undefined distances (put them at the end)
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          comparison = a.distance - b.distance;
          break;
        case "completedTasks":
          comparison = b.completedTasks - a.completedTasks;
          break;
      }

      return order === "asc" ? comparison : -comparison;
    });

    // Apply pagination
    const paginatedResults = processedResults.slice(
      (page - 1) * limit,
      page * limit
    );

    // Fetch additional data for the paginated results
    await this.enrichTaskerData(paginatedResults, serviceId);

    return {
      taskers: paginatedResults,
      total: processedResults.length,
      page,
      limit,
      totalPages: Math.ceil(processedResults.length / limit),
    };
  },

  /**
   * Enrich tasker data with reviews and additional skills
   */
  async enrichTaskerData(
    taskers: TaskerForService[],
    currentServiceId: number
  ): Promise<void> {
    if (taskers.length === 0) return;

    const taskerIds = taskers.map((tasker) => tasker.id);

    // Create a map for quick lookup
    const taskerMap = new Map<number, TaskerForService>();
    taskers.forEach((tasker) => {
      taskerMap.set(tasker.id, tasker);
    });

    // Fetch reviews for these taskers
    const taskerReviews = await this.getTaskerReviews(taskerIds);

    // Group reviews by tasker ID
    const reviewsByTaskerId = new Map<number, any[]>();
    taskerReviews.forEach((review) => {
      if (!reviewsByTaskerId.has(review.taskerId)) {
        reviewsByTaskerId.set(review.taskerId, []);
      }
      reviewsByTaskerId.get(review.taskerId)!.push(review);
    });

    // Add reviews to taskers
    for (const [taskerId, reviews] of reviewsByTaskerId.entries()) {
      const tasker = taskerMap.get(taskerId);
      if (tasker) {
        tasker.reviews = reviews.map((review) => ({
          rating: review.rating,
          comment: review.comment,
          date: review.createdAt,
          userName: review.userName || "Anonymous",
        }));
      }
    }

    // Fetch additional skills for these taskers
    const additionalSkills = await db
      .select({
        taskerId: taskerSkills.taskerId,
        serviceId: taskerSkills.serviceId,
        serviceName: services.name,
        hourlyRate: taskerSkills.hourlyRate,
        experience: taskerSkills.experience,
        experienceYears: taskerSkills.experienceYears,
      })
      .from(taskerSkills)
      .innerJoin(services, eq(taskerSkills.serviceId, services.id))
      .where(
        and(
          inArray(taskerSkills.taskerId, taskerIds),
          not(eq(taskerSkills.serviceId, currentServiceId)),
          eq(taskerSkills.isActive, true)
        )
      );

    // Add additional skills to taskers
    additionalSkills.forEach((skill) => {
      const tasker = taskerMap.get(skill.taskerId);
      if (tasker) {
        tasker.skills!.push({
          serviceId: skill.serviceId,
          serviceName: skill.serviceName,
          hourlyRate: skill.hourlyRate,
          // experience: skill.experience,
          // experienceYears: skill.experienceYears,
        });
      }
    });
  },

  /**
   * Get reviews for taskers
   */
  async getTaskerReviews(taskerIds: number[] | number) {
    const taskerId = Array.isArray(taskerIds)
      ? inArray(reviews.taskerId, taskerIds)
      : eq(reviews.taskerId, taskerIds);

    const reviewsList = await db
      .select({
        id: reviews.id,
        taskerId: reviews.taskerId,
        userId: reviews.userId,
        // rating: reviews.overallRating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        userName: users.firstName,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(taskerId)
      .orderBy(desc(reviews.createdAt));

    return reviewsList;
  },

  /**
   * Count services (for pagination)
   */
  async countServices(
    params: Omit<ServiceListingParams, "page" | "limit" | "sort" | "order"> = {}
  ): Promise<number> {
    const { categoryId, search } = params;

    // Build query conditions
    const conditions = [];

    // Only show active services
    conditions.push(eq(services.isActive, true));

    // Filter by category if provided
    if (categoryId) {
      conditions.push(eq(services.categoryId, categoryId));
    }

    // Search by name or description
    if (search) {
      conditions.push(
        or(
          like(services.name, `%${search}%`),
          like(services.description || "", `%${search}%`)
          // like(services.shortDescription || "", `%${search}%`)
        )
      );
    }

    // Execute count query
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(services)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return Number(result[0]?.count || 0);
  },

  /**
   * Get services by category
   */
  async getServicesByCategory(
    categoryId: number,
    params: Omit<ServiceListingParams, "categoryId"> = {}
  ): Promise<ServiceWithTaskers[]> {
    return this.getServices({
      ...params,
      categoryId,
    });
  },

  /**
   * Search services
   */
  async searchServices(
    query: string,
    params: Omit<ServiceListingParams, "search"> = {}
  ): Promise<ServiceWithTaskers[]> {
    return this.getServices({
      ...params,
      search: query,
    });
  },

  /**
   * Create a new service
   */
  async createService(serviceData: {
    name: string;
    description?: string;
    shortDescription?: string;
    categoryId: number;
    basePrice?: number;
    pricingType?: string;
    duration?: number;
    durationUnit?: string;
    image?: string;
    gallery?: string[];
    tags?: string[];
    customFields?: any;
    isPopular?: boolean;
    isFeatured?: boolean;
    slug?: string;
    metadata?: any;
    attributes?: { attributeId: number; value: string }[];
    faqs?: { question: string; answer: string; displayOrder?: number }[];
  }): Promise<ServiceWithTaskers> {
    const { attributes, faqs, ...data } = serviceData;

    // Generate slug if not provided
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });

    // Check if slug already exists
    const existingService = await db
      .select()
      .from(services)
      .where(eq(services.slug, slug))
      .limit(1);

    if (existingService.length > 0) {
      throw new AppError("Service with this slug already exists", 400);
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Create service
      const serviceResult = await tx
        .insert(services)
        .values({
          ...data,
          slug,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const service = serviceResult[0];

      // Add attributes if provided
      if (attributes && attributes.length > 0) {
        const attributeValues = attributes.map((attr) => ({
          serviceId: service.id,
          attributeId: attr.attributeId,
          value: attr.value,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(serviceAttributeValues).values(attributeValues);
      }

      // Add FAQs if provided
      if (faqs && faqs.length > 0) {
        const faqValues = faqs.map((faq, index) => ({
          serviceId: service.id,
          question: faq.question,
          answer: faq.answer,
          displayOrder: faq.displayOrder || index,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(serviceFaqs).values(faqValues);
      }

      // Return the created service
      return this.getServiceById(service.id) as Promise<ServiceWithTaskers>;
    });
  },

  /**
   * Update an existing service
   */
  async updateService(
    id: number,
    serviceData: Partial<{
      name: string;
      description: string;
      shortDescription: string;
      categoryId: number;
      basePrice: number;
      pricingType: string;
      duration: number;
      durationUnit: string;
      image: string;
      gallery: string[];
      tags: string[];
      customFields: string;
      isPopular: boolean;
      isFeatured: boolean;
      slug: string;
      metadata: string;
      isActive: boolean;
      attributes: { attributeId: number; value: string }[];
      faqs: (
        | { question: string; answer: string; displayOrder?: number }
        | {
            id: number;
            question?: string;
            answer?: string;
            displayOrder?: number;
          }
      )[];
    }>
  ): Promise<ServiceWithTaskers | undefined> {
    const { attributes, faqs, ...data } = serviceData;

    // If slug is being updated, check if it already exists
    if (data.slug) {
      const existingService = await db
        .select()
        .from(services)
        .where(and(eq(services.slug, data.slug), sql`${services.id} != ${id}`))
        .limit(1);

      if (existingService.length > 0) {
        throw new AppError("Service with this slug already exists", 400);
      }
    }

    // If name is being updated but not slug, generate a new slug
    if (data.name && !data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true });

      // Check if generated slug already exists
      const existingService = await db
        .select()
        .from(services)
        .where(and(eq(services.slug, data.slug), sql`${services.id} != ${id}`))
        .limit(1);

      if (existingService.length > 0) {
        // Append ID to make slug unique
        data.slug = `${data.slug}-${id}`;
      }
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Update service
      const serviceResult = await tx
        .update(services)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(services.id, id))
        .returning();

      if (serviceResult.length === 0) {
        return undefined;
      }

      // Update attributes if provided
      if (attributes && attributes.length > 0) {
        // Delete existing attribute values
        await tx
          .delete(serviceAttributeValues)
          .where(eq(serviceAttributeValues.serviceId, id));

        // Insert new attribute values
        const attributeValues = attributes.map((attr) => ({
          serviceId: id,
          attributeId: attr.attributeId,
          value: attr.value,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(serviceAttributeValues).values(attributeValues);
      }

      // Update FAQs if provided
      if (faqs && faqs.length > 0) {
        // Process FAQs to update, create, or delete
        const faqsToCreate = [];
        const faqsToUpdate = [];
        const existingFaqIds = [];

        faqs.forEach((faq, index) => {
          if ("id" in faq) {
            // Update existing FAQ
            existingFaqIds.push(faq.id);
            faqsToUpdate.push({
              id: faq.id,
              data: {
                question: faq.question,
                answer: faq.answer,
                displayOrder:
                  faq.displayOrder !== undefined ? faq.displayOrder : index,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new FAQ
            faqsToCreate.push({
              serviceId: id,
              question: faq.question,
              answer: faq.answer,
              displayOrder: faq.displayOrder || index,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });

        // Delete FAQs that are not in the update list
        if (existingFaqIds.length > 0) {
          await tx
            .delete(serviceFaqs)
            .where(
              and(
                eq(serviceFaqs.serviceId, id),
                sql`${serviceFaqs.id} NOT IN (${existingFaqIds.join(",")})`
              )
            );
        } else {
          // If no existing FAQs are being kept, delete all
          await tx.delete(serviceFaqs).where(eq(serviceFaqs.serviceId, id));
        }

        // Update existing FAQs
        for (const faq of faqsToUpdate) {
          await tx
            .update(serviceFaqs)
            .set(faq.data)
            .where(
              and(eq(serviceFaqs.id, faq.id), eq(serviceFaqs.serviceId, id))
            );
        }

        // Create new FAQs
        if (faqsToCreate.length > 0) {
          await tx.insert(serviceFaqs).values(faqsToCreate);
        }
      }

      // Return the updated service
      return this.getServiceById(id) as Promise<ServiceWithTaskers>;
    });
  },

  /**
   * Delete a service
   */
  async deleteService(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Delete attribute values
      await tx
        .delete(serviceAttributeValues)
        .where(eq(serviceAttributeValues.serviceId, id));

      // Delete FAQs
      await tx.delete(serviceFaqs).where(eq(serviceFaqs.serviceId, id));

      // Delete service
      const result = await tx
        .delete(services)
        .where(eq(services.id, id))
        .returning();

      return result.length > 0;
    });
  },

  /**
   * Toggle service active status
   */
  async toggleServiceActive(
    id: number,
    isActive: boolean
  ): Promise<ServiceWithTaskers | undefined> {
    const result = await db
      .update(services)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    if (result.length === 0) {
      return undefined;
    }

    return this.getServiceById(id);
  },
};
